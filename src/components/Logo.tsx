/** โลโก้สติกเกอร์ WaveLength ใช้ทั้งหน้าแรกและในเกม */
export default function Logo() {
  return (
    <div className="logo">
      <span className="star s1" aria-hidden>
        ✨
      </span>
      <span className="star s2" aria-hidden>
        ⭐
      </span>
      <span className="mark" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12c2 0 2-6 4-6s2 12 4 12 2-12 4-12 2 6 4 6" />
        </svg>
      </span>
      <span className="name">
        <span className="n1">
          <b>Wave</b>
          <i>Length</i>
        </span>
        <span className="n2">คลื่นความถี่อ่านใจ 🧠⚡</span>
      </span>
    </div>
  )
}
