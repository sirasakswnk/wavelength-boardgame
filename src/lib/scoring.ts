// การคิดคะแนน + สุ่มเป้าหมาย
// โซนคะแนน (ครึ่งความกว้าง หน่วยเป็น position 0..1) : กลาง=4, ถัดออก=3, รอบนอก=2, พลาด=0

export const BANDS = { b4: 0.032, b3: 0.078, b2: 0.132 } as const

export type Score = 0 | 2 | 3 | 4

export function scoreFor(guess: number, target: number): Score {
  const d = Math.abs(guess - target)
  if (d <= BANDS.b4) return 4
  if (d <= BANDS.b3) return 3
  if (d <= BANDS.b2) return 2
  return 0
}

/** สุ่มตำแหน่งเป้าหมาย โดยเว้นขอบซ้าย/ขวาไว้ให้โซนคะแนนไม่ตกขอบมากไป */
export function randomTarget(): number {
  return 0.15 + Math.random() * 0.7
}

export interface ScoreCopy {
  text: string
  tone: 'good' | 'ok' | 'miss'
}

export function scoreCopy(score: Score): ScoreCopy {
  switch (score) {
    case 4:
      return { text: '🎯 แม่นมาก! +4', tone: 'good' }
    case 3:
      return { text: '👏 เยี่ยม +3', tone: 'good' }
    case 2:
      return { text: '😅 เฉียด +2', tone: 'ok' }
    default:
      return { text: '💨 พลาด +0', tone: 'miss' }
  }
}
