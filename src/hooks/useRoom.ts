import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { getFirebase } from '../lib/firebase'
import { setupPresence, subscribeRoom, type RoomSnapshot } from '../lib/rooms'
import { errorMessage } from '../lib/errors'

export function useRoom(code: string | null, uid: string | null) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setRoom(null)
    setError(null)
    setLoading(!!code)
    if (!code || !uid) return
    let alive = true
    const report = (e: unknown) => { if (alive) { setError(errorMessage(e)); setLoading(false) } }
    const timeout = window.setTimeout(() => report(new Error('โหลดห้องนานกว่าปกติ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่')), 12000)
    const unsub = subscribeRoom(code, snapshot => {
      if (!alive) return
      window.clearTimeout(timeout)
      setRoom(snapshot)
      setError(null)
      setLoading(false)
    }, report)
    const connection = onValue(ref(getFirebase().db, '.info/connected'), snap => setConnected(snap.val() === true), report)
    return () => { alive = false; window.clearTimeout(timeout); unsub(); connection() }
  }, [code, uid, attempt])
  const member = !!uid && !!room?.players.some(p => p.uid === uid)
  const closed = room?.pub.phase === 'closed'
  useEffect(() => {
    if (!code || !uid || !member || closed) return
    let alive = true
    const cleanup = setupPresence(code, uid, e => { if (alive) setError(errorMessage(e)) })
    return () => { alive = false; cleanup() }
  }, [code, uid, member, closed, attempt])
  return { room: room?.code === code ? room : null, loading, error, connected, retry: () => setAttempt(n => n + 1) }
}
