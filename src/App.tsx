import { lazy, Suspense, useRef, useState } from 'react'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Confetti, { type ConfettiHandle } from './components/Confetti'
import { firebaseReady } from './lib/firebase'
import { useAuth } from './hooks/useAuth'
import { useRoom } from './hooks/useRoom'
import { useAction } from './hooks/useAction'
import { advanceRound, createRoom, joinRoom, leaveRoom } from './lib/rooms'

const OnlineGame = lazy(() => import('./components/OnlineGame'))
const SESSION_KEY = 'wavelength.room.v2'
function storedRoom() {
  try {
    const code = sessionStorage.getItem(SESSION_KEY)
    return code && /^[A-Z0-9]{4}$/.test(code) ? code : null
  } catch { return null }
}
const SPRINKLES = [
  { emoji: '🎲', style: { left: '6%', top: '18%' } },
  { emoji: '✨', style: { right: '7%', top: '14%', animationDelay: '1.2s' } },
  { emoji: '🃏', style: { left: '9%', bottom: '12%', animationDelay: '.6s' } },
  { emoji: '🎯', style: { right: '6%', bottom: '18%', animationDelay: '1.8s' } },
]
export default function App() {
  const { uid, error: authError } = useAuth()
  const [code, setCode] = useState<string | null>(storedRoom)
  const { room, loading, error: roomError, connected, retry } = useRoom(code, uid)
  const action = useAction()
  const confettiRef = useRef<ConfettiHandle | null>(null)
  function rememberRoom(next: string | null) {
    try { if (next) sessionStorage.setItem(SESSION_KEY, next); else sessionStorage.removeItem(SESSION_KEY) } catch { /* Storage may be disabled. The current game still works. */ }
    setCode(next)
  }
  function handleCreate(name: string, avatar: string, rounds: number) {
    if (uid) void action.run(async () => rememberRoom(await createRoom(uid, name, avatar, rounds)))
  }
  function handleJoin(joinCode: string, name: string, avatar: string) {
    if (uid) void action.run(async () => { await joinRoom(joinCode, uid, name, avatar); rememberRoom(joinCode) })
  }
  function handleStart() {
    if (room && code && connected) void action.run(() => advanceRound(code, room.pub))
  }
  function handleLeave() {
    void action.run(async () => {
      if (code && uid && room && room.pub.phase !== 'closed' && room.players.some(p => p.uid === uid)) {
        if (!connected) throw new Error('กรุณารอเชื่อมต่อก่อนออกจากห้อง เพื่อแจ้งเพื่อนว่าเกมจบแล้ว')
        await leaveRoom(code, uid)
      }
      rememberRoom(null)
    })
  }
  const error = action.error ?? roomError ?? authError
  const bothOnline = !!room && room.players.length === 2 && room.players.every(p => room.online[p.uid])
  let content
  if (!firebaseReady) {
    content = <div className="home"><div className="config-missing"><div className="cm-title">⚙️ ยังไม่ได้ตั้งค่า Firebase</div><p>ตั้งค่าไฟล์ .env ตาม README แล้วรีสตาร์ท dev server</p></div></div>
  } else if (!code) {
    content = <Home onCreate={handleCreate} onJoin={handleJoin} busy={action.busy || !uid} error={error} />
  } else if (!uid || loading || !room || !room.players.some(p => p.uid === uid) || room.pub.phase === 'closed') {
    const message = !uid || loading ? '⏳ กำลังเข้าห้อง…' : room?.pub.phase === 'closed' ? 'ห้องปิดแล้ว เนื่องจากมีผู้เล่นออกจากเกม' : 'ไม่พบห้องหรือคุณไม่ได้อยู่ในห้องนี้'
    content = <div className="home"><div className="loading-box" role="status">{message}</div><button className="btn how-btn" onClick={() => rememberRoom(null)}>กลับหน้าแรก</button></div>
  } else if (room.pub.phase === 'lobby') {
    content = <Lobby room={room} uid={uid} busy={action.busy || !connected || !bothOnline} onStart={handleStart} onLeave={handleLeave} />
  } else {
    content = <Suspense fallback={<div className="loading-box">กำลังโหลดเกม…</div>}><OnlineGame key={`${code}:${room.pub.roundId}`} room={room} uid={uid} code={code} connected={connected} leaving={action.busy} confettiRef={confettiRef} onLeave={handleLeave} /></Suspense>
  }
  return <>
    <div className="rays" aria-hidden />
    {SPRINKLES.map((s, i) => <span key={i} className="sprinkle" style={s.style} aria-hidden>{s.emoji}</span>)}
    {code && error && <div className="home-error" role="alert">{error} <button className="btn how-btn" disabled={action.busy} onClick={() => { if (action.error) action.retry(); else retry() }}>ลองใหม่</button></div>}
    {code && room && !connected && <div className="connection-notice" role="status">ขาดการเชื่อมต่อ กำลังเชื่อมต่อใหม่…</div>}
    {content}
    <Confetti ref={confettiRef} />
  </>
}
