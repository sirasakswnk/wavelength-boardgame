import { useRef, type ReactElement, type PointerEvent as RPE } from 'react'
import {
  DIAL,
  polar,
  annulusPath,
  ringSegmentPoints,
  pointerToPosition,
} from '../lib/geometry'
import { BANDS } from '../lib/scoring'

const { cx, cy, rIn, rOut, labR, viewW, viewH } = DIAL

interface DialProps {
  target: number
  needle: number
  /** เปิดฝาให้เห็นโซนเป้าหมายไหม (มุมคนใบ้ตอนพิมพ์คำใบ้ หรือหลังเฉลย) */
  showTarget: boolean
  /** แสดงเข็มแดง (เข็มของคนทาย) ไหม — เฉพาะตอนทาย/เฉลย */
  showNeedle: boolean
  /** ลากเข็มได้ไหม (เฉพาะตอนคนทายกำลังหมุน) */
  interactive: boolean
  /** ออฟเซ็ตการหมุนของขีดขอบวงล้อ (คนใบ้หมุนสุ่ม) — 0 = นิ่ง, ค่ามาก = หมุนไป */
  tickSpin: number
  /** ให้ "?" บนฝากะพริบเชิญชวนให้แตะ */
  tapHint: boolean
  /** ความคืบหน้าการเลื่อนเปิดฝา 0..1 (0 = ปิดสนิท, 1 = เปิดหมด) */
  reveal: number
  /** อยู่เฟสเฉลยไหม (เข็มเด้ง + โซนเป้าหมายเรืองแสง) */
  revealed: boolean
  /** ให้เข็มแกว่งไปมาเบาๆ (ใช้โชว์ในหน้าแรก) */
  sway?: boolean
  /** ให้ฝา "หายใจ" กะพริบเบาๆ (คนทายกำลังรอคำใบ้) */
  waiting?: boolean
  onNeedle: (p: number) => void
  /** แตะวงล้อ (ใช้ตอนหมุนสุ่ม/เปิดฝา) */
  onTap?: () => void
}

/** สร้างแถบโค้งเนียน ระหว่าง a..b (subdivide เป็นชิ้นเล็ก) */
function band(a: number, b: number, color: string, keyPrefix: string): ReactElement[] {
  const lo = Math.max(0, Math.min(1, a))
  const hi = Math.max(0, Math.min(1, b))
  const out: ReactElement[] = []
  if (hi > lo) {
    const n = Math.max(2, Math.ceil((hi - lo) * 48))
    for (let i = 0; i < n; i++) {
      const p1 = lo + ((hi - lo) * i) / n
      const p2 = lo + ((hi - lo) * (i + 1)) / n
      out.push(
        <polygon key={keyPrefix + i} points={ringSegmentPoints(p1, p2, rIn, rOut)} fill={color} />,
      )
    }
  }
  return out
}

function zoneLabel(p: number, txt: string, key: string): ReactElement | null {
  if (p < 0 || p > 1) return null
  const [x, y] = polar(p, labR)
  return (
    <text
      key={key}
      x={x}
      y={y + 6}
      textAnchor="middle"
      fontSize={19}
      fontWeight={900}
      fill="#fff"
      stroke="rgba(0,0,0,.3)"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {txt}
    </text>
  )
}

function edgeLine(p: number, key: string): ReactElement {
  const [x1, y1] = polar(p, rIn)
  const [x2, y2] = polar(p, rOut)
  return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={2.5} />
}

// ---- ชิ้นส่วนที่วาดครั้งเดียว (คงที่) ----
const FACE_TICKS: ReactElement[] = Array.from({ length: 41 }, (_, i) => {
  const p = i / 40
  const [ax, ay] = polar(p, rOut - 5)
  const [bx, by] = polar(p, i % 5 === 0 ? rOut - 19 : rOut - 12)
  return (
    <line
      key={`ft${i}`}
      x1={ax}
      y1={ay}
      x2={bx}
      y2={by}
      stroke="var(--cream-line)"
      strokeWidth={i % 5 === 0 ? 2.5 : 1.5}
      strokeLinecap="round"
    />
  )
})

// ขีดสีเทาที่ขอบวงล้อ — เลื่อน (scroll) ตาม offset เพื่อให้ดูเหมือนวงล้อหมุน
const OUTER_TICK_COUNT = 40
function renderOuterTicks(offset: number): ReactElement[] {
  const out: ReactElement[] = []
  for (let i = 0; i < OUTER_TICK_COUNT; i++) {
    let p = ((i / OUTER_TICK_COUNT + offset) % 1 + 1) % 1
    const major = i % 5 === 0
    const [ax, ay] = polar(p, rOut + 27)
    const [bx, by] = polar(p, rOut + (major ? 42 : 35))
    out.push(
      <line
        key={`ot${i}`}
        x1={ax}
        y1={ay}
        x2={bx}
        y2={by}
        stroke="rgba(9,60,66,.4)"
        strokeWidth={major ? 3.5 : 2}
        strokeLinecap="round"
      />,
    )
  }
  return out
}

const COVER_WAVE = (() => {
  const [qx, qy] = polar(0.5, labR)
  return `M ${qx - 38} ${qy} q 9.5 -16 19 0 t 19 0 t 19 0 t 19 0`
})()
const [COVER_QX, COVER_QY] = polar(0.5, labR - 32)

export default function Dial({
  target,
  needle,
  showTarget,
  showNeedle,
  interactive,
  tickSpin,
  tapHint,
  reveal,
  revealed,
  sway = false,
  waiting = false,
  onNeedle,
  onTap,
}: DialProps) {
  const pivotStyle = { transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' as const }
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragging = useRef(false)

  function emit(e: RPE<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const p = pointerToPosition(svg, e.clientX, e.clientY)
    if (p != null) onNeedle(p)
  }
  function down(e: RPE<SVGSVGElement>) {
    if (interactive) {
      dragging.current = true
      svgRef.current?.setPointerCapture(e.pointerId)
      emit(e)
    } else {
      onTap?.()
    }
  }
  function move(e: RPE<SVGSVGElement>) {
    if (interactive && dragging.current) emit(e)
  }
  function up() {
    dragging.current = false
  }

  const [tipX, tipY] = polar(needle, rOut + 14)

  return (
    <svg
      ref={svgRef}
      className={`dial${interactive || onTap ? ' interactive' : ''}`}
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label="วงล้อสเปกตรัมสำหรับทายตำแหน่ง"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <defs>
        <filter id="dial-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,.28)" />
        </filter>
        {/* ปาดฝาเลื่อนซ้าย→ขวา: เก็บฝาไว้เฉพาะฝั่งขวาที่ยังไม่เปิด */}
        <clipPath id="cover-wipe">
          <rect x={reveal * viewW} y={0} width={viewW * (1 - reveal)} height={viewH} />
        </clipPath>
        {/* จำกัดขอบแสงให้อยู่ในหน้าปัด */}
        <clipPath id="face-clip">
          <path d={annulusPath(rIn, rOut)} />
        </clipPath>
      </defs>

      {/* กรอบเครื่องเทอร์ควอยซ์ (เข้ม คงเดิม) */}
      <path d={annulusPath(rOut + 4, rOut + 24)} fill="var(--teal)" stroke="var(--ink)" strokeWidth={3.5} />
      <path d={annulusPath(rOut + 19, rOut + 24)} fill="var(--teal-deep)" />

      {/* หน้าปัดครีม + เส้นขีด */}
      <path d={annulusPath(rIn, rOut)} fill="var(--cream)" stroke="var(--ink)" strokeWidth={3} />
      {FACE_TICKS}

      {/* โซนเป้าหมาย (โชว์เมื่อเปิดฝา หรือระหว่างเลื่อนเปิด) */}
      {(showTarget || reveal > 0) && (
        <g className={revealed ? 'target-pulse' : undefined} style={revealed ? pivotStyle : undefined}>
          {band(target - BANDS.b2, target - BANDS.b3, 'var(--wedge2)', 'l2')}
          {band(target - BANDS.b3, target - BANDS.b4, 'var(--wedge3)', 'l3')}
          {band(target - BANDS.b4, target + BANDS.b4, 'var(--wedge4)', 'c4')}
          {band(target + BANDS.b4, target + BANDS.b3, 'var(--wedge3)', 'r3')}
          {band(target + BANDS.b3, target + BANDS.b2, 'var(--wedge2)', 'r2')}
          {zoneLabel(target, '4', 'z4')}
          {zoneLabel(target - (BANDS.b4 + BANDS.b3) / 2, '3', 'z3a')}
          {zoneLabel(target + (BANDS.b4 + BANDS.b3) / 2, '3', 'z3b')}
          {zoneLabel(target - (BANDS.b3 + BANDS.b2) / 2, '2', 'z2a')}
          {zoneLabel(target + (BANDS.b3 + BANDS.b2) / 2, '2', 'z2b')}
          {edgeLine(target - BANDS.b2, 'eL')}
          {edgeLine(target + BANDS.b2, 'eR')}
        </g>
      )}

      {/* ฝาปิดโทนอ่อน (โชว์เมื่อยังไม่เปิด) — ถูกปาดเลื่อนตาม reveal */}
      {!showTarget && (
        <g clipPath="url(#cover-wipe)">
          <path d={annulusPath(rIn, rOut)} fill="var(--teal-soft)" stroke="var(--ink)" strokeWidth={3} />
          <path
            className={tapHint || waiting ? 'tap-hint' : undefined}
            d={COVER_WAVE}
            fill="none"
            stroke="rgba(0,140,136,.55)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <text
            className={tapHint || waiting ? 'tap-hint' : undefined}
            x={COVER_QX}
            y={COVER_QY + 8}
            textAnchor="middle"
            fontSize={24}
            fontWeight={900}
            fill="rgba(0,140,136,.75)"
          >
            ?
          </text>
        </g>
      )}

      {/* ขอบแสงทองวิ่งตามรอยเลื่อนเปิด */}
      {!showTarget && reveal > 0.02 && reveal < 0.98 && (
        <g clipPath="url(#face-clip)">
          <rect x={reveal * viewW - 3.5} y={0} width={7} height={viewH} fill="var(--sun)" />
          <rect x={reveal * viewW - 1} y={0} width={2} height={viewH} fill="#fff" opacity={0.85} />
        </g>
      )}

      {renderOuterTicks(tickSpin)}

      {/* รัศมีเรืองแสงที่ปลายเข็มตอนเฉลย */}
      {showNeedle && revealed && (
        <circle
          className="tip-glow"
          cx={tipX}
          cy={tipY}
          r={13}
          fill="none"
          stroke="var(--sun)"
          strokeWidth={4}
          style={{ transformOrigin: `${tipX}px ${tipY}px`, transformBox: 'view-box' }}
        />
      )}

      {/* เข็มแดง (เข็มของคนทาย) — เด้งสปริงตอนเฉลย / แกว่งเบาๆ ตอนโชว์ */}
      {showNeedle && (
        <g
          className={revealed ? 'needle-wiggle' : sway ? 'needle-sway' : undefined}
          style={revealed || sway ? pivotStyle : undefined}
        >
          <line
            x1={cx}
            y1={cy}
            x2={tipX}
            y2={tipY}
            stroke="var(--needle)"
            strokeWidth={8}
            strokeLinecap="round"
            filter="url(#dial-soft)"
          />
          <circle cx={tipX} cy={tipY} r={10} fill="#fff" stroke="var(--needle)" strokeWidth={4.5} />
          <circle cx={cx} cy={cy} r={17} fill="var(--teal)" stroke="var(--ink)" strokeWidth={3.5} />
          <circle cx={cx} cy={cy} r={5.5} fill="#fff" />
        </g>
      )}
    </svg>
  )
}
