import { useState } from 'react'
import Logo from './Logo'
import type { RoomSnapshot } from '../lib/rooms'
import AvatarIcon from './AvatarIcon'

interface LobbyProps {
  room: RoomSnapshot
  uid: string
  onStart: () => void
  onLeave: () => void
}

export default function Lobby({ room, uid, onStart, onLeave }: LobbyProps) {
  const [copied, setCopied] = useState(false)
  const isHost = room.pub.hostUid === uid
  const full = room.players.length >= 2

  function copyCode() {
    navigator.clipboard?.writeText(room.code).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1400)
      },
      () => {},
    )
  }

  return (
    <div className="home lobby">
      <Logo />

      <div className="lobby-panel">
        <div className="lobby-title">รหัสห้อง</div>
        <button type="button" className="room-code" onClick={copyCode} aria-label="คัดลอกรหัสห้อง">
          {room.code}
          <span className="copy-hint">{copied ? '✓ คัดลอกแล้ว' : '📋 แตะเพื่อคัดลอก'}</span>
        </button>
        <p className="lobby-share">ส่งรหัสนี้ให้เพื่อนกรอกในหน้า “เข้าร่วมห้อง”</p>

        <div className="lobby-players">
          {[0, 1].map((slot) => {
            const p = room.players.find((pl) => pl.slot === slot)
            return (
              <div className={`lobby-seat${p ? ' filled' : ''}`} key={slot}>
                <span className="seat-av">{p ? <AvatarIcon avatar={p.avatar} /> : '➕'}</span>
                <span className="seat-name">
                  {p ? p.name : 'รอเพื่อน…'}
                  {p && p.uid === uid ? ' (คุณ)' : ''}
                </span>
              </div>
            )
          })}
        </div>

        {full ? (
          isHost ? (
            <button type="button" className="btn primary home-start" onClick={onStart}>
              ▶ เริ่มเกม
            </button>
          ) : (
            <div className="lobby-wait">⏳ รอโฮสต์กดเริ่มเกม…</div>
          )
        ) : (
          <div className="lobby-wait">⏳ รอเพื่อนเข้าห้อง…</div>
        )}
      </div>

      <button type="button" className="btn how-btn" onClick={onLeave}>
        ← ออกจากห้อง
      </button>
    </div>
  )
}
