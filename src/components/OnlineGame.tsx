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
import {
  advanceRound,
  finalizeScore,
  getMyTarget,
  revealRound,
  saveTarget,
  setPsyStatus,
  setupPresence,
  submitClue,
  submitGuess,
  type RoomSnapshot,
} from '../lib/rooms'

type PsyStep = 'spin' | 'peek' | 'clue'

interface OnlineGameProps {
  room: RoomSnapshot
  uid: string
  code: string
  confettiRef: RefObject<ConfettiHandle | null>
  onLeave: () => void
}

const SPIN_DURATION = 1600
const OPEN_DURATION = 1200

export default function OnlineGame({ room, uid, code, confettiRef, onLeave }: OnlineGameProps) {
  const { pub, players } = room
  const amPsychic = pub.psychicUid === uid
  const guesser = players.find((p) => p.uid !== pub.psychicUid) ?? null
  const psychicPlayer = players.find((p) => p.uid === pub.psychicUid) ?? null
  const card = CARDS.find((c) => c.id === pub.cardId) ?? CARDS[0]

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
  const finalizedRound = useRef(-1)
  const confettiRound = useRef(-1)

  // ---- reset ทุกครั้งที่ขึ้นรอบใหม่ ----
  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    spinningRef.current = false
    openingRef.current = false
    setPsyStep('spin')
    setMyTarget(null)
    setSpinTick(0)
    setSpinning(false)
    setOpenProgress(0)
    setOpening(false)
    setClueDraft('')
    setLocalNeedle(0.5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub.round])

  // presence: ออนไลน์อยู่ในห้อง + ล้างเมื่อหลุด
  useEffect(() => setupPresence(code, uid), [code, uid])

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

  // คนใบ้: ถ้ารีเฟรชกลางรอบ (ยังทาย/เฉลย) ให้ดึงเป้าหมายจาก secret กลับมา
  useEffect(() => {
    if (amPsychic && myTarget == null && (pub.phase === 'guessing' || pub.phase === 'revealed')) {
      getMyTarget(code).then((t) => {
        if (t != null) setMyTarget(t)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amPsychic, pub.phase])

  // คนใบ้: พอเห็นเฟส revealed ให้คิดคะแนน (เพราะมีเป้าหมายจริง)
  useEffect(() => {
    if (
      amPsychic &&
      pub.phase === 'revealed' &&
      pub.revealed &&
      pub.targetShown == null &&
      myTarget != null &&
      guesser &&
      finalizedRound.current !== pub.round
    ) {
      finalizedRound.current = pub.round
      finalizeScore(code, myTarget, pub.needle, guesser).catch(() => { })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amPsychic, pub.phase, pub.revealed, pub.targetShown, myTarget, pub.round])

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

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
  }, [])

  // ---- actions คนใบ้ ----
  function startSpin() {
    if (spinningRef.current) return
    spinningRef.current = true
    setSpinning(true)
    const t = randomTarget()
    setMyTarget(t)
    saveTarget(code, t).catch(() => { })
    setPsyStatus(code, 'spinning').catch(() => { })
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
        setPsyStatus(code, 'peeking').catch(() => { })
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
        setPsyStatus(code, 'thinking').catch(() => { })
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function handleTap() {
    if (!amPsychic || pub.phase !== 'setup') return
    if (psyStep === 'spin') startSpin()
    else if (psyStep === 'peek') openCover()
  }

  function sendClue() {
    if (!clueDraft.trim()) return
    submitClue(code, clueDraft.trim()).catch(() => { })
  }

  // ---- actions คนทาย ----
  function onNeedle(p: number) {
    setLocalNeedle(p)
    const now = performance.now()
    if (now - lastGuessWrite.current > 60) {
      lastGuessWrite.current = now
      submitGuess(code, p).catch(() => { })
    }
  }
  function reveal() {
    submitGuess(code, localNeedle)
      .then(() => revealRound(code))
      .catch(() => { })
  }

  function nextRound() {
    advanceRound(code, pub, players, false).catch(() => { })
  }

  // ---- derived สำหรับวาด ----
  const guesserTargetReady = pub.phase === 'revealed' && pub.targetShown != null
  const displayTarget = amPsychic ? myTarget ?? 0.5 : pub.targetShown ?? 0.5
  const displayNeedle = amPsychic ? pub.needle ?? 0.5 : localNeedle
  const showTarget = amPsychic
    ? (pub.phase === 'setup' && psyStep === 'clue') || pub.phase === 'guessing' || pub.phase === 'revealed'
    : guesserTargetReady
  const showNeedle = pub.phase === 'guessing' || pub.phase === 'revealed'
  const interactive = !amPsychic && pub.phase === 'guessing'
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

  return (
    <>
      <Logo />

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
            รอบที่ <b>{pub.round}</b>
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
            <button type="button" className="btn primary" onClick={reveal}>
              🎉 เฉลย!
            </button>
          )}
          {pub.phase === 'revealed' && (
            <button type="button" className="btn primary" onClick={nextRound}>
              🎲 รอบต่อไป
            </button>
          )}
          <button type="button" className="btn how-btn" onClick={onLeave}>
            ← ออกจากห้อง
          </button>
        </div>
      </div>
    </>
  )
}
