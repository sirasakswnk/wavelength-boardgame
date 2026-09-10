import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Logo from './Logo'
import Dial from './Dial'
import ConceptCard from './ConceptCard'
import PlayerCard from './PlayerCard'
import ClueArea from './ClueArea'
import AvatarIcon from './AvatarIcon'
import type { ConfettiHandle } from './Confetti'
import { CARDS } from '../data/cards'
import { randomTarget, scoreCopy, type Score } from '../lib/scoring'
import { useAction } from '../hooks/useAction'
import {
  advanceRound,
  DEFAULT_ROUNDS,
  finalizeScore,
  getMyTarget,
  restartGame,
  saveTarget,
  setPsyStatus,
  submitClue,
  submitGuess,
  type RoomSnapshot,
} from '../lib/rooms'

type PsyStep = 'spin' | 'peek' | 'clue'

interface OnlineGameProps {
  room: RoomSnapshot
  uid: string
  code: string
  connected: boolean
  leaving: boolean
  confettiRef: RefObject<ConfettiHandle | null>
  onLeave: () => void
}

const SPIN_DURATION = 1600
const OPEN_DURATION = 1200

export default function OnlineGame({ room, uid, code, connected, leaving, confettiRef, onLeave }: OnlineGameProps) {
  const { pub, players } = room
  const amPsychic = pub.psychicUid === uid
  const guesser = players.find((p) => p.uid !== pub.psychicUid) ?? null
  const psychicPlayer = players.find((p) => p.uid === pub.psychicUid) ?? null
  const card = CARDS.find((c) => c.id === pub.cardId) ?? CARDS[0]
  const totalRounds = pub.totalRounds ?? DEFAULT_ROUNDS
  const isLastRound = (pub.round ?? 0) >= totalRounds
  const isHost = pub.hostUid === uid
  const { busy, error, report, run, retry } = useAction()
  const bothOnline = players.length === 2 && players.every(p => room.online[p.uid])
  const paused = !connected || !bothOnline || leaving
  const [targetLoading, setTargetLoading] = useState(amPsychic)
  const [targetAttempt, setTargetAttempt] = useState(0)

  // ---- state ฝั่งเครื่อง ----
  const [psyStep, setPsyStep] = useState<PsyStep>('spin')
  const [myTarget, setMyTarget] = useState<number | null>(null)
  const [spinTick, setSpinTick] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [openProgress, setOpenProgress] = useState(0)
  const [opening, setOpening] = useState(false)
  const [clueDraft, setClueDraft] = useState('')
  const [localNeedle, setLocalNeedle] = useState(pub.needle ?? 0.5)
  const [shake, setShake] = useState(false)
  const [guesserSpin, setGuesserSpin] = useState(0)

  const dialWrapRef = useRef<HTMLDivElement | null>(null)
  const spinningRef = useRef(false)
  const openingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const guesserSpinRef = useRef<number | null>(null)
  const lastGuessWrite = useRef(0)
  const confettiRound = useRef(-1)
  const needleTimer = useRef<ReturnType<typeof setTimeout>>()
  const needleQueue = useRef<Promise<void>>(Promise.resolve())
  const needleDirty = useRef(false)
  const needleValue = useRef(localNeedle)
  const mounted = useRef(true)

  // App keys this component by roundId, including rematches.
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; clearTimeout(needleTimer.current) }
  }, [])
  useEffect(() => {
    if (!needleDirty.current || pub.phase === 'revealed') {
      setLocalNeedle(pub.needle)
      needleValue.current = pub.needle
    }
  }, [pub.needle, pub.phase])

  // คนทาย: วงล้อหมุนตามตอนคนใบ้กำลังหมุน
  useEffect(() => {
    if (!amPsychic && pub.psyStatus === 'spinning') {
      let v = 0
      const loop = () => {
        v += 0.02
        setGuesserSpin(v)
        guesserSpinRef.current = requestAnimationFrame(loop)
      }
      guesserSpinRef.current = requestAnimationFrame(loop)
      return () => {
        if (guesserSpinRef.current != null) cancelAnimationFrame(guesserSpinRef.current)
      }
    }
    setGuesserSpin(0)
  }, [amPsychic, pub.psyStatus])

  // Restore an immutable target in every phase, including setup after refresh.
  useEffect(() => {
    if (!amPsychic) return
    let alive = true
    setTargetLoading(true)
    getMyTarget(code, pub.roundId).then(t => {
      if (!alive) return
      setMyTarget(t)
      if (t != null) setPsyStep(pub.psyStatus === 'thinking' ? 'clue' : 'peek')
      setTargetLoading(false)
    }).catch(e => { if (alive) report(e) })
    return () => { alive = false }
    // Status is restored once; live status changes must not interrupt local animations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amPsychic, code, pub.roundId, targetAttempt, report])

  // Either member can finalize after the guess has been locked. Transaction + rules deduplicate.
  useEffect(() => {
    if (connected && pub.phase === 'revealed' && pub.roundScore == null) {
      void run(() => finalizeScore(code, pub.roundId))
    }
  }, [connected, pub.phase, pub.roundScore, pub.roundId, code, run])

  // ทั้งคู่: ยิงคอนเฟตตี/สั่นจอ ตอนคะแนนออก
  useEffect(() => {
    if (pub.phase === 'revealed' && pub.roundScore != null && confettiRound.current !== pub.round) {
      confettiRound.current = pub.round
      const sc = pub.roundScore
      if (sc >= 2) {
        const rect = dialWrapRef.current?.getBoundingClientRect()
        const ox = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
        const oy = rect ? rect.top + rect.height * 0.72 : window.innerHeight / 2
        confettiRef.current?.burst(ox, oy, { big: sc === 4 })
      }
      if (sc === 4) {
        setShake(true)
        window.setTimeout(() => setShake(false), 520)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub.phase, pub.roundScore, pub.round])

  // ยิงคอนเฟตตีฉลองตอนจบเกม
  useEffect(() => {
    if (pub.phase === 'ended') {
      confettiRef.current?.burst(window.innerWidth / 2, window.innerHeight * 0.34, { big: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub.phase])

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
  }, [])

  // ---- actions คนใบ้ ----
  async function startSpin() {
    if (spinningRef.current) return
    spinningRef.current = true
    setSpinning(true)
    try {
      const t = await saveTarget(code, pub.roundId, randomTarget())
      await setPsyStatus(code, pub.roundId, 'spinning')
      if (!mounted.current) return
      setMyTarget(t)
    } catch (e) {
      spinningRef.current = false
      setSpinning(false)
      throw e
    }
    const turns = 3 + Math.random() * 2
    const t0 = performance.now()
    const tick = (now: number) => {
      const tt = Math.min(1, (now - t0) / SPIN_DURATION)
      const eased = 1 - Math.pow(1 - tt, 3)
      setSpinTick(eased * turns)
      if (tt < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        setSpinTick(0)
        spinningRef.current = false
        setSpinning(false)
        setPsyStep('peek')
        void run(() => setPsyStatus(code, pub.roundId, 'peeking'))
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function openCover() {
    if (openingRef.current) return
    openingRef.current = true
    setOpening(true)
    const t0 = performance.now()
    const tick = (now: number) => {
      const tt = Math.min(1, (now - t0) / OPEN_DURATION)
      const eased = tt < 0.5 ? 4 * tt * tt * tt : 1 - Math.pow(-2 * tt + 2, 3) / 2
      setOpenProgress(eased)
      if (tt < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        setOpenProgress(0)
        setOpening(false)
        openingRef.current = false
        setPsyStep('clue')
        void run(() => setPsyStatus(code, pub.roundId, 'thinking'))
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function handleTap() {
    if (!amPsychic || pub.phase !== 'setup' || paused || busy || targetLoading) return
    if (psyStep === 'spin') void run(startSpin)
    else if (psyStep === 'peek') openCover()
  }

  function sendClue() {
    if (!clueDraft.trim() || paused) return
    void run(() => submitClue(code, pub.roundId, clueDraft.trim()))
  }

  // ---- actions คนทาย ----
  function onNeedle(p: number) {
    if (paused || busy) return
    setLocalNeedle(p)
    needleValue.current = p
    needleDirty.current = true
    const now = performance.now()
    clearTimeout(needleTimer.current)
    if (now - lastGuessWrite.current > 60) {
      lastGuessWrite.current = now
      writeNeedle(p)
    } else needleTimer.current = setTimeout(() => writeNeedle(needleValue.current), 80)
  }
  function writeNeedle(p: number) {
    needleQueue.current = needleQueue.current.then(() => mounted.current ? submitGuess(code, pub.roundId, p) : undefined).then(() => {
      if (needleValue.current === p) needleDirty.current = false
    }).catch(e => { if (mounted.current) report(e) })
  }
  function reveal() {
    if (paused) return
    clearTimeout(needleTimer.current)
    const needle = needleValue.current
    void run(async () => {
      await needleQueue.current
      await submitGuess(code, pub.roundId, needle, true)
      await finalizeScore(code, pub.roundId)
    })
  }

  function nextRound() {
    if (!paused) void run(() => advanceRound(code, pub))
  }

  function playAgain() {
    if (!paused) void run(() => restartGame(code, pub))
  }

  // ---- derived สำหรับวาด ----
  const guesserTargetReady = pub.phase === 'revealed' && pub.targetShown != null
  const displayTarget = amPsychic ? myTarget ?? 0.5 : pub.targetShown ?? 0.5
  const displayNeedle = amPsychic || pub.phase === 'revealed' ? pub.needle : localNeedle
  const showTarget = amPsychic
    ? (pub.phase === 'setup' && psyStep === 'clue') || pub.phase === 'guessing' || pub.phase === 'revealed'
    : guesserTargetReady
  const showNeedle = pub.phase === 'guessing' || pub.phase === 'revealed'
  const interactive = !amPsychic && pub.phase === 'guessing' && !paused && !busy
  const tapHint = amPsychic && pub.phase === 'setup' && !spinning && !opening && (psyStep === 'spin' || psyStep === 'peek')

  const clueVisible =
    (amPsychic && pub.phase === 'setup' && psyStep === 'clue') ||
    pub.phase === 'guessing' ||
    pub.phase === 'revealed'
  const clueMode = amPsychic && pub.phase === 'setup' && psyStep === 'clue' ? 'input' : 'show'

  const activeUid = pub.phase === 'setup' ? pub.psychicUid : guesser?.uid ?? null

  const psyStatusText =
    pub.psyStatus === 'spinning'
      ? 'กำลังหมุนสุ่มโจทย์'
      : pub.psyStatus === 'peeking'
        ? 'กำลังเปิดดูเป้าหมาย'
        : pub.psyStatus === 'thinking'
          ? 'กำลังคิดคำใบ้'
          : 'กำลังเริ่ม'

  const note = useMemo(() => {
    if (amPsychic) {
      if (pub.phase === 'setup') {
        if (spinning) return '🎡 กำลังหมุนสุ่มตำแหน่ง…'
        if (opening) return '📂 กำลังเลื่อนเปิดฝา…'
        if (psyStep === 'spin') return '🎡 แตะวงล้อเพื่อหมุนสุ่มตำแหน่งเป้าหมาย'
        if (psyStep === 'peek') return '🎲 แตะวงล้ออีกครั้งเพื่อเปิดฝาดูโซนเป้าหมาย'
        return '🔮 นี่คือโซนเป้าหมาย! พิมพ์คำใบ้ให้เพื่อน'
      }
      if (pub.phase === 'guessing') return '🔮 คนทายกำลังหมุนเข็ม… (คุณเห็นเป้าหมาย)'
      return pub.targetShown == null
        ? '⏳ กำลังคิดคะแนน…'
        : `🌸 เฉลยแล้ว — ${guesser?.name ?? 'คนทาย'} ได้ ${pub.roundScore} คะแนน`
    }
    // คนทาย
    if (pub.phase === 'setup') return '🎲 เตรียมอ่านใจเพื่อนให้ดี…'
    if (pub.phase === 'guessing') return '📖 อ่านคำใบ้แล้วลากเข็มไปยังตำแหน่งที่คิดว่าใช่'
    return pub.targetShown == null ? '⏳ กำลังเฉลย…' : `🎊 คุณทายได้ ${pub.roundScore} คะแนน!`
  }, [amPsychic, pub.phase, pub.targetShown, pub.roundScore, psyStep, spinning, opening, guesser])

  const noteCta =
    (amPsychic && pub.phase === 'setup' && !spinning && !opening && (psyStep === 'spin' || psyStep === 'peek')) ||
    (!amPsychic && pub.phase === 'guessing')

  const burst =
    pub.phase === 'revealed' && pub.roundScore != null ? scoreCopy(pub.roundScore as Score) : null
  const feedback = <>
    {!bothOnline && <div className="connection-notice" role="status">รอเพื่อนเชื่อมต่อกลับเข้าห้อง… เกมและคะแนนยังอยู่</div>}
    {error && <div className="home-error" role="alert">{error} <button className="btn how-btn" disabled={busy || !connected} onClick={() => {
      if (targetLoading) setTargetAttempt(n => n + 1)
      else if (pub.phase === 'revealed' && pub.roundScore == null) void run(() => finalizeScore(code, pub.roundId))
      else if (pub.phase === 'guessing' && !amPsychic) void run(() => submitGuess(code, pub.roundId, needleValue.current))
      else retry()
    }}>ลองใหม่</button></div>}
    {busy && <div role="status">กำลังบันทึก…</div>}
    {targetLoading && amPsychic && <div role="status">กำลังโหลดเป้าหมาย…</div>}
  </>

  // ---- หน้าจบเกม (ผลลัพธ์) ----
  if (pub.phase === 'ended') {
    const ranked = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const tie = ranked.length >= 2 && (ranked[0].score ?? 0) === (ranked[1].score ?? 0)
    const winner = tie ? null : ranked[0]
    const iWon = winner?.uid === uid

    return (
      <>
        <Logo />
        {feedback}
        <div className="results">
          <div className="results-crown" aria-hidden>{tie ? '🤝' : '👑'}</div>
          <div className="results-title">
            {tie ? 'เสมอกัน!' : iWon ? 'คุณชนะ! 🎉' : `${winner?.name ?? ''} ชนะ!`}
          </div>
          <div className="results-sub">จบครบ {totalRounds} รอบแล้ว</div>

          <div className="results-board">
            {ranked.map((p, i) => (
              <div
                className={`results-row${!tie && i === 0 ? ' win' : ''}`}
                key={p.uid}
              >
                <span className="results-rank">{!tie && i === 0 ? '👑' : `#${i + 1}`}</span>
                <span className="results-av"><AvatarIcon avatar={p.avatar} /></span>
                <span className="results-name">
                  {p.name}{p.uid === uid ? ' (คุณ)' : ''}
                </span>
                <span className="results-score">{p.score ?? 0}</span>
              </div>
            ))}
          </div>

          <div className="controls">
            {isHost ? (
              <button type="button" className="btn primary" disabled={busy || paused} onClick={playAgain}>
                🔄 เล่นอีกครั้ง
              </button>
            ) : (
              <div className="lobby-wait">⏳ รอโฮสต์เริ่มเกมใหม่…</div>
            )}
            <button type="button" className="btn how-btn" disabled={leaving || busy} onClick={onLeave}>
              ← ออกจากห้อง
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Logo />
      {feedback}

      <div className={`board${shake ? ' shake' : ''}`}>
        <header className="statusrow">
          {players.slice(0, 2).map((p) => (
            <PlayerCard
              key={p.uid}
              name={p.name + (p.uid === uid ? ' (คุณ)' : '')}
              avatar={p.avatar}
              role={p.uid === pub.psychicUid ? 'psychic' : 'guesser'}
              score={p.score}
              active={activeUid === p.uid}
            />
          ))}
          <div className="roundchip" key={pub.round}>
            รอบที่ <b>{pub.round}</b> / {totalRounds}
          </div>
        </header>

        <div className="dialrow">
          <ConceptCard side="L" word={card.left} color={card.colorLeft} flipKey={card.id} />
          <div className="dialwrap" ref={dialWrapRef}>
            <Dial
              target={displayTarget}
              needle={displayNeedle}
              showTarget={showTarget}
              showNeedle={showNeedle}
              interactive={interactive}
              tickSpin={amPsychic ? spinTick : guesserSpin}
              tapHint={tapHint}
              waiting={!amPsychic && pub.phase === 'setup'}
              reveal={amPsychic ? openProgress : 0}
              revealed={pub.phase === 'revealed'}
              onNeedle={onNeedle}
              onTap={handleTap}
            />
            {burst && <div className={`scoreburst ${burst.tone}`}>{burst.text}</div>}
          </div>
          <ConceptCard side="R" word={card.right} color={card.colorRight} flipKey={card.id} />
        </div>

        {clueVisible && (
          <ClueArea
            mode={clueMode}
            psychicAvatar={psychicPlayer?.avatar ?? '🔮'}
            clue={pub.clue}
            draft={clueDraft}
            onDraft={setClueDraft}
            onSubmit={sendClue}
            disabled={busy || paused || targetLoading}
          />
        )}

        {!amPsychic && pub.phase === 'setup' && (
          <div className="psy-status">
            <span className="psy-status-av" aria-hidden>
              <AvatarIcon avatar={psychicPlayer?.avatar ?? '🔮'} />
            </span>
            <span className="psy-status-text">
              {psychicPlayer?.name ?? 'คนใบ้'} {psyStatusText}
              <span className="dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </span>
          </div>
        )}

        <div className="note">
          <span className={`tag${noteCta ? ' cta' : ''}`} key={note}>
            {note}
          </span>
        </div>

        <div className="controls">
          {pub.phase === 'guessing' && !amPsychic && (
            <button type="button" className="btn primary" disabled={busy || paused} onClick={reveal}>
              🎉 เฉลย!
            </button>
          )}
          {pub.phase === 'revealed' && isHost && (
            <button type="button" className="btn primary" disabled={busy || paused || pub.roundScore == null} onClick={nextRound}>
              {isLastRound ? '🏁 ดูผลลัพธ์' : '🎲 รอบต่อไป'}
            </button>
          )}
          {pub.phase === 'revealed' && !isHost && <div role="status">รอโฮสต์เริ่มรอบต่อไป…</div>}
          <button type="button" className="btn how-btn" disabled={leaving || busy} onClick={onLeave}>
            ← ออกจากห้อง
          </button>
        </div>
      </div>
    </>
  )
}
