import type { Card } from '../types'

// ชุดการ์ดหัวข้อภาษาไทย (ชุดตั้งต้น — ค่อยขยายเป็น 50–100 คู่ในขั้นถัดไป)
// สีซ้าย/ขวา ใช้ไล่โทนของแต่ละหัวข้อ (คนละฝั่งคนละอารมณ์)
export const CARDS: Card[] = [
  { id: 'hot-cold', left: 'เย็น', right: 'ร้อน', colorLeft: '#3E8EF7', colorRight: '#F4572E' },
  { id: 'old-new', left: 'เชย', right: 'ล้ำสมัย', colorLeft: '#8B5CF6', colorRight: '#00B3AE' },
  { id: 'cheap-exp', left: 'ของถูก', right: 'ของแพง', colorLeft: '#00C48C', colorRight: '#FFAE2E' },
  { id: 'scary-cute', left: 'น่ากลัว', right: 'น่ารัก', colorLeft: '#5A3E85', colorRight: '#FF4E87' },
  { id: 'useless-useful', left: 'ไร้ประโยชน์', right: 'มีประโยชน์', colorLeft: '#FF9F1C', colorRight: '#00C48C' },
  { id: 'quiet-loud', left: 'เงียบ', right: 'เสียงดัง', colorLeft: '#3E8EF7', colorRight: '#F4572E' },
  { id: 'plain-special', left: 'ธรรมดา', right: 'พิเศษสุด', colorLeft: '#64748B', colorRight: '#FF4E87' },
  { id: 'simple-luxury', left: 'เรียบง่าย', right: 'หรูหรา', colorLeft: '#00C48C', colorRight: '#FFAE2E' },
  { id: 'boring-exciting', left: 'น่าเบื่อ', right: 'ตื่นเต้น', colorLeft: '#64748B', colorRight: '#F4572E' },
  { id: 'safe-danger', left: 'ปลอดภัย', right: 'อันตราย', colorLeft: '#00C48C', colorRight: '#F4572E' },
  { id: 'ancient-modern', left: 'โบราณ', right: 'ทันสมัย', colorLeft: '#B45309', colorRight: '#3E8EF7' },
  { id: 'introvert-extrovert', left: 'เก็บตัว', right: 'เข้าสังคมจัด', colorLeft: '#6366F1', colorRight: '#FF9F1C' },
  { id: 'mild-spicy', left: 'เผ็ดน้อย', right: 'เผ็ดจัด', colorLeft: '#22C55E', colorRight: '#F4572E' },
  { id: 'snack-meal', left: 'ของกินเล่น', right: 'ของกินจริงจัง', colorLeft: '#FFAE2E', colorRight: '#8B5CF6' },
  { id: 'weak-strong-hero', left: 'ฮีโร่อ่อนแอ', right: 'ฮีโร่ทรงพลัง', colorLeft: '#64748B', colorRight: '#F4572E' },
  { id: 'kids-adult-movie', left: 'หนังเด็ก', right: 'หนังผู้ใหญ่', colorLeft: '#00C48C', colorRight: '#6D28D9' },
  { id: 'useless-skill', left: 'ทักษะไร้ค่า', right: 'ทักษะมีค่า', colorLeft: '#94A3B8', colorRight: '#00C48C' },
  { id: 'unwanted-job', left: 'งานไม่มีใครอยากทำ', right: 'งานใครๆก็อยากทำ', colorLeft: '#78716C', colorRight: '#FFAE2E' },
  { id: 'tellable-secret', left: 'ความลับที่บอกได้', right: 'ความลับที่ห้ามบอก', colorLeft: '#3E8EF7', colorRight: '#DB2777' },
  { id: 'unlucky-lucky', left: 'โชคร้าย', right: 'โชคดี', colorLeft: '#475569', colorRight: '#FFC93C' },
  { id: 'trust-suspicious', left: 'น่าไว้ใจ', right: 'น่าสงสัย', colorLeft: '#00C48C', colorRight: '#9333EA' },
  { id: 'small-big', left: 'เรื่องเล็ก', right: 'เรื่องใหญ่', colorLeft: '#38BDF8', colorRight: '#EF4444' },
  { id: 'savory-sweet', left: 'อาหารคาว', right: 'อาหารหวาน', colorLeft: '#F97316', colorRight: '#EC4899' },
  { id: 'morning-night', left: 'กินตอนเช้า', right: 'กินตอนดึก', colorLeft: '#FBBF24', colorRight: '#4338CA' },
]

/** สุ่มการ์ด โดยหลีกเลี่ยงการ์ดใบเดิม */
export function randomCard(exclude?: Card): Card {
  let c: Card
  do {
    c = CARDS[Math.floor(Math.random() * CARDS.length)]
  } while (exclude && c.id === exclude.id && CARDS.length > 1)
  return c
}
