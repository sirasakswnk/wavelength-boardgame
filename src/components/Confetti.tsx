import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface ConfettiHandle {
  burst: (x: number, y: number, opts?: { big?: boolean }) => void
}

interface Part {
  x: number
  y: number
  vx: number
  vy: number
  s: number
  c: string
  rot: number
  vr: number
  life: number
  decay: number
  star: boolean
}

const COLORS = ['#FF4E87', '#FFD23F', '#00C2BB', '#3E8EF7', '#F4572E', '#00C48C', '#ffffff']
const GOLD = ['#FFD23F', '#FFAE2E', '#ffffff']

function reduceMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

const Confetti = forwardRef<ConfettiHandle>(function Confetti(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const parts = useRef<Part[]>([])
  const raf = useRef<number | null>(null)

  function ensureLoop() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || raf.current != null) return
    const step = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ps = parts.current
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.vy += 0.28
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.life -= p.decay
        if (p.life <= 0 || p.y > canvas.height + 40) {
          ps.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
        ctx.fillStyle = p.c
        if (p.star) drawStar(ctx, p.s)
        else ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
        ctx.restore()
      }
      if (ps.length > 0) {
        raf.current = requestAnimationFrame(step)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        raf.current = null
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  function spawnBurst(x: number, y: number, big: boolean) {
    if (reduceMotion()) return
    const n = big ? 170 : 90
    const spread = big ? 2.8 : 2.2
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * spread
      const sp = (big ? 8 : 6) + Math.random() * (big ? 12 : 9)
      const star = big && Math.random() < 0.4
      const c = star ? GOLD[i % GOLD.length] : COLORS[i % COLORS.length]
      parts.current.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        s: star ? 7 + Math.random() * 5 : 5 + Math.random() * 6,
        c,
        rot: Math.random() * 6.3,
        vr: (Math.random() - 0.5) * 0.35,
        life: 1,
        decay: 0.008,
        star,
      })
    }
    ensureLoop()
  }

  function spawnSpark(x: number, y: number) {
    if (reduceMotion()) return
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 3 + Math.random() * 5
      parts.current.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        s: 3 + Math.random() * 3,
        c: GOLD[i % GOLD.length],
        rot: Math.random() * 6.3,
        vr: (Math.random() - 0.5) * 0.4,
        life: 1,
        decay: 0.028,
        star: Math.random() < 0.4,
      })
    }
    ensureLoop()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // สะเก็ดกระเด็นเวลากดปุ่มลูกกวาด (.btn)
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('.btn')) spawnSpark(e.clientX, e.clientY)
    }
    document.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('resize', resize)
      document.removeEventListener('click', onClick)
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    burst(x: number, y: number, opts?: { big?: boolean }) {
      spawnBurst(x, y, opts?.big ?? false)
    },
  }))

  return <canvas ref={canvasRef} className="confetti" aria-hidden />
})

export default Confetti
