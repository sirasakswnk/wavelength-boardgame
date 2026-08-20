import CountUp from './CountUp'
import AvatarIcon from './AvatarIcon'

interface PlayerCardProps {
  name: string
  avatar: string
  role: 'psychic' | 'guesser'
  score: number
  /** ไฮไลต์ว่าตอนนี้เป็นตาของผู้เล่นคนนี้ */
  active: boolean
}

export default function PlayerCard({ name, avatar, role, score, active }: PlayerCardProps) {
  return (
    <div className={`pcard${active ? ' turn' : ''}`}>
      <span className="av" aria-hidden>
        <AvatarIcon avatar={avatar} />
      </span>
      <span className="pinfo">
        <span className="nm">{name}</span>
        {/* key={role} → พลิก (flip) ตอนสลับบทบาท */}
        <span className={`rolepill ${role === 'psychic' ? 'psy' : 'gsr'}`} key={role}>
          {role === 'psychic' ? '🔮 คนใบ้' : '🕵️ คนทาย'}
        </span>
      </span>
      <span className="score" title="คะแนนสะสม">
        <CountUp value={score} />
      </span>
    </div>
  )
}
