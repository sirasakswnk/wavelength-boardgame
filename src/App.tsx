import { useRef, useState } from 'react'
import Home from './components/Home'
import Lobby from './components/Lobby'
import OnlineGame from './components/OnlineGame'
import Confetti, { type ConfettiHandle } from './components/Confetti'
import { firebaseReady } from './lib/firebase'
import { useAuth } from './hooks/useAuth'
import { useRoom } from './hooks/useRoom'
import { advanceRound, createRoom, joinRoom, leaveRoom } from './lib/rooms'

const SPRINKLES = [
  { emoji: '🎲', style: { left: '6%', top: '18%' } },
  { emoji: '✨', style: { right: '7%', top: '14%', animationDelay: '1.2s' } },
  { emoji: '🃏', style: { left: '9%', bottom: '12%', animationDelay: '.6s' } },
  { emoji: '🎯', style: { right: '6%', bottom: '18%', animationDelay: '1.8s' } },
]

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export default function App() {
  const { uid, error: authError } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const room = useRoom(code)
  const confettiRef = useRef<ConfettiHandle | null>(null)

  async function handleCreate(name: string, avatar: string) {
    if (!uid) return
    setBusy(true)
    setActionError(null)
    try {
      const c = await createRoom(uid, name, avatar)
      setCode(c)
    } catch (e) {
      setActionError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(joinCode: string, name: string, avatar: string) {
    if (!uid) return
    setBusy(true)
    setActionError(null)
    try {
      await joinRoom(joinCode, uid, name, avatar)
      setCode(joinCode)
    } catch (e) {
      setActionError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleStart() {
    if (!room || !code) return
    try {
      await advanceRound(code, room.pub, room.players, true)
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  async function handleLeave() {
    if (code && uid) {
      try {
        await leaveRoom(code, uid)
      } catch {
        /* ไม่เป็นไร ออกจากห้องฝั่ง client ได้เลย */
      }
    }
    setCode(null)
    setActionError(null)
  }

  let content
  if (!firebaseReady) {
    content = (
      <div className="home">
        <div className="config-missing">
          <div className="cm-title">⚙️ ยังไม่ได้ตั้งค่า Firebase</div>
          <p>
            สร้างไฟล์ <code>.env</code> (ก๊อปจาก <code>.env.example</code>) แล้วเติมค่า{' '}
            <code>VITE_FIREBASE_*</code> จาก Firebase Console จากนั้นรีสตาร์ท dev server
          </p>
        </div>
      </div>
    )
  } else if (!code) {
    content = (
      <Home
        onCreate={handleCreate}
        onJoin={handleJoin}
        busy={busy || !uid}
        error={actionError ?? authError}
      />
    )
  } else if (!room) {
    content = (
      <div className="home">
        <div className="loading-box">⏳ กำลังเข้าห้อง…</div>
      </div>
    )
  } else if (room.pub.phase === 'lobby') {
    content = <Lobby room={room} uid={uid!} onStart={handleStart} onLeave={handleLeave} />
  } else {
    content = (
      <OnlineGame room={room} uid={uid!} code={code} confettiRef={confettiRef} onLeave={handleLeave} />
    )
  }

  return (
    <>
      <div className="rays" aria-hidden />
      {SPRINKLES.map((s, i) => (
        <span key={i} className="sprinkle" style={s.style} aria-hidden>
          {s.emoji}
        </span>
      ))}

      {content}

      <Confetti ref={confettiRef} />
    </>
  )
}
