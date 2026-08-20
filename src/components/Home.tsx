import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import Dial from './Dial'
import ConceptCard from './ConceptCard'
import { CARDS } from '../data/cards'
import { randomTarget } from '../lib/scoring'

const AVATARS = ['🦊', '🐸', '🐱', '🐰', '🐼', '🦁']

const HOW_STEPS = [
  { emoji: '🎡', text: 'คนใบ้หมุนวงล้อสุ่มตำแหน่ง แล้วพิมพ์คำใบ้ให้เพื่อน' },
  { emoji: '😶‍🌫️', text: 'คนทายอ่านคำใบ้ แล้วลากเข็มไปยังตำแหน่งที่คิดว่าใช่' },
  { emoji: '🎊', text: 'เฉลย! ยิ่งเข็มใกล้เป้าหมาย ยิ่งได้แต้มเยอะ' },
  { emoji: '🔄', text: 'สลับกันเป็นคนใบ้/คนทายทุกรอบ ใครแต้มรวมสูงกว่าชนะ' },
]

interface HomeProps {
  onCreate: (name: string, avatar: string) => void
  onJoin: (code: string, name: string, avatar: string) => void
  busy: boolean
  error: string | null
}

export default function Home({ onCreate, onJoin, busy, error }: HomeProps) {
  const [cardIdx, setCardIdx] = useState(0)
  const [target, setTarget] = useState(() => randomTarget())
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [showHow, setShowHow] = useState(false)
  const [joining, setJoining] = useState(false)
  const [codeInput, setCodeInput] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => {
      setCardIdx((i) => (i + 1) % CARDS.length)
      setTarget(randomTarget())
    }, 2600)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!showHow) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHow(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showHow])

  const card = CARDS[cardIdx]
  const nameValid = name.trim().length > 0
  const myName = () => name.trim()

  return (
    <div className="home">
      <Logo />
      <p className="home-tagline">
        เกมทายจงทายจายย — <b>ไหนดูความเก่งของคุณหน่อย</b>
      </p>

      {/* Hero: วงล้อโชว์ + คำหัวข้อสลับ */}
      <div className="home-showcase">
        <div className="dialrow">
          <ConceptCard side="L" word={card.left} color={card.colorLeft} flipKey={card.id} />
          <div className="dialwrap">
            <Dial
              target={target}
              needle={0.5}
              showTarget
              showNeedle
              interactive={false}
              tickSpin={0}
              tapHint={false}
              reveal={0}
              revealed={false}
              sway
              onNeedle={() => { }}
            />
          </div>
          <ConceptCard side="R" word={card.right} color={card.colorRight} flipKey={card.id} />
        </div>
      </div>

      {/* ตั้งชื่อ + เลือกอวตาร (เครื่องคุณ = 1 คน) */}
      <div className="home-setup">
        <PlayerSetup label="คุณ" name={name} onName={setName} avatar={avatar} onAvatar={setAvatar} />
      </div>

      {!nameValid && <div className="home-hint">👆 ใส่ชื่อเล่นของคุณก่อนสร้าง/เข้าห้อง</div>}

      {error && <div className="home-error">⚠️ {error}</div>}

      {/* สร้าง / เข้าร่วมห้อง */}
      <div className="home-actions">
        <button
          type="button"
          className="btn primary home-start"
          disabled={busy || !nameValid}
          onClick={() => onCreate(myName(), avatar)}
        >
          🏠 สร้างห้อง
        </button>

        {!joining ? (
          <button
            type="button"
            className="btn how-btn"
            disabled={busy || !nameValid}
            onClick={() => setJoining(true)}
          >
            🔑 เข้าร่วมห้อง
          </button>
        ) : (
          <form
            className="join-form"
            onSubmit={(e) => {
              e.preventDefault()
              onJoin(codeInput.trim().toUpperCase(), myName(), avatar)
            }}
          >
            <input
              className="join-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={4}
              placeholder="รหัสห้อง"
              aria-label="รหัสห้อง"
              autoFocus
            />
            <button
              type="submit"
              className="btn teal"
              disabled={busy || !nameValid || codeInput.trim().length < 4}
            >
              เข้าห้อง ➜
            </button>
          </form>
        )}
      </div>

      {busy && <div className="home-busy">⏳ กำลังเชื่อมต่อ…</div>}

      {/* วิธีเล่น (ปุ่มเปิด pop-up) */}
      <button type="button" className="btn how-btn" onClick={() => setShowHow(true)}>
        📖 วิธีเล่น
      </button>

      {showHow && (
        <div className="modal-overlay" onClick={() => setShowHow(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="วิธีเล่น"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowHow(false)}
              aria-label="ปิด"
            >
              ✕
            </button>
            <div className="modal-title">📖 วิธีเล่น</div>
            <div className="how-steps">
              {HOW_STEPS.map((s, i) => (
                <div className="how-step" key={i}>
                  <span className="how-num">{i + 1}</span>
                  <span className="how-emoji" aria-hidden>
                    {s.emoji}
                  </span>
                  <span className="how-text">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface PlayerSetupProps {
  label: string
  name: string
  onName: (s: string) => void
  avatar: string
  onAvatar: (a: string) => void
}

function PlayerSetup({ label, name, onName, avatar, onAvatar }: PlayerSetupProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="setup-row" ref={rootRef}>
      <button
        type="button"
        className="setup-badge"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`เลือกอวตาร ${label} (ตอนนี้ ${avatar})`}
      >
        <span className="badge-emoji">{avatar}</span>
        <span className="badge-caret" aria-hidden>
          ▾
        </span>
      </button>
      <input
        className="setup-name"
        value={name}
        onChange={(e) => onName(e.target.value)}
        maxLength={16}
        placeholder="ชื่อเล่นของคุณ"
        aria-label="ชื่อเล่นของคุณ"
      />
      {open && (
        <div className="avatar-pop" role="group" aria-label="เลือกอวตาร">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              className={`avatar-btn${avatar === a ? ' on' : ''}`}
              onClick={() => {
                onAvatar(a)
                setOpen(false)
              }}
              aria-pressed={avatar === a}
            >
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
