interface ConceptCardProps {
  side: 'L' | 'R'
  word: string
  color: string
  /** เปลี่ยนค่า → การ์ดพลิก (3D flip) เผยคำใหม่ */
  flipKey: string
}

export default function ConceptCard({ side, word, color, flipKey }: ConceptCardProps) {
  return (
    <div className={`concept ${side}`}>
      <div className="concept-inner" key={flipKey} style={{ background: color }}>
        <span className="pin" aria-hidden />
        <span className="side">{side === 'L' ? '◀ ฝั่งซ้าย' : 'ฝั่งขวา ▶'}</span>
        <span className="word">{word}</span>
      </div>
    </div>
  )
}
