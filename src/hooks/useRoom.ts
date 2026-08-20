import { useEffect, useState } from 'react'
import { subscribeRoom, type RoomSnapshot } from '../lib/rooms'

/** subscribe สถานะห้องแบบ realtime (null = ยังไม่เข้าห้อง หรือห้องหาย) */
export function useRoom(code: string | null): RoomSnapshot | null {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)

  useEffect(() => {
    if (!code) {
      setRoom(null)
      return
    }
    const unsub = subscribeRoom(code, setRoom)
    return unsub
  }, [code])

  return room
}
