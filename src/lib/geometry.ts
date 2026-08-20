// เรขาคณิตของวงล้อครึ่งวงกลม — ใช้ร่วมกันทั้งการวาดและการคำนวณตำแหน่งเข็ม
// ตำแหน่ง (position) เป็นค่า 0..1 : 0 = ซ้ายสุด, 0.5 = บนสุด, 1 = ขวาสุด

export const DIAL = {
  cx: 230,
  cy: 224,
  rIn: 64,
  rOut: 176,
  labR: 132,
  viewW: 460,
  viewH: 250,
} as const

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

export const clamp01 = (x: number) => clamp(x, 0, 1)

/** จุดบนวงล้อที่ตำแหน่ง p (0..1) รัศมี r */
export function polar(p: number, r: number): [number, number] {
  const a = Math.PI * (1 - p)
  return [DIAL.cx + r * Math.cos(a), DIAL.cy - r * Math.sin(a)]
}

/** path ของวงแหวนครึ่งวงกลม (ด้านบน) จากรัศมีใน rInner ถึงนอก rOuter */
export function annulusPath(rInner: number, rOuter: number): string {
  const { cx, cy } = DIAL
  return (
    `M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 0 1 ${cx + rOuter} ${cy} ` +
    `L ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 0 0 ${cx - rInner} ${cy} Z`
  )
}

/** points ของ polygon สี่เหลี่ยมโค้ง (ชิ้นเล็ก) ระหว่าง p1..p2 คร่อมรัศมี rInner..rOuter */
export function ringSegmentPoints(
  p1: number,
  p2: number,
  rInner: number,
  rOuter: number,
): string {
  const o1 = polar(p1, rOuter)
  const o2 = polar(p2, rOuter)
  const i2 = polar(p2, rInner)
  const i1 = polar(p1, rInner)
  return (
    `${o1[0].toFixed(1)},${o1[1].toFixed(1)} ${o2[0].toFixed(1)},${o2[1].toFixed(1)} ` +
    `${i2[0].toFixed(1)},${i2[1].toFixed(1)} ${i1[0].toFixed(1)},${i1[1].toFixed(1)}`
  )
}

/** แปลงพิกัดหน้าจอ (client x,y) ให้เป็นตำแหน่ง p (0..1) บนวงล้อ */
export function pointerToPosition(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): number | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const loc = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  const dx = loc.x - DIAL.cx
  const dy = DIAL.cy - loc.y
  let ang = Math.atan2(dy, dx)
  if (ang < 0) ang = 0
  if (ang > Math.PI) ang = Math.PI
  return clamp(1 - ang / Math.PI, 0.02, 0.98)
}
