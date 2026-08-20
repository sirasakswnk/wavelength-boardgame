import { useEffect, useRef, useState } from 'react'

/** ตัวเลขวิ่งขึ้นจากค่าเดิม→ค่าใหม่ (ease-out) + เด้ง pop ตอนเปลี่ยน */
export default function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const [animating, setAnimating] = useState(false)
  const displayRef = useRef(value)

  useEffect(() => {
    const from = displayRef.current
    const to = value
    if (from === to) return
    setAnimating(true)
    let raf = 0
    const DUR = 550
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DUR)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(from + (to - from) * eased)
      displayRef.current = v
      setDisplay(v)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        displayRef.current = to
        setDisplay(to)
        setAnimating(false)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span className={`countup${animating ? ' up' : ''}`}>{display}</span>
}
