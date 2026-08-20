// โครงข้อมูลหลักของเกม (ออกแบบให้แมปกับ Firebase RTDB ได้ตรงๆ ในขั้นถัดไป)

export interface Card {
  id: string
  left: string
  right: string
  colorLeft: string
  colorRight: string
}

export interface Player {
  id: 'A' | 'B'
  name: string
  avatar: string
  score: number
}

/** ค่าที่ผู้เล่นตั้งในหน้าแรก (ชื่อ + อวตาร) ก่อนเริ่มเกม */
export interface PlayerConfig {
  name: string
  avatar: string
}

/** เฟสภายในหนึ่งรอบ
 *  spin     = คนใบ้แตะวงล้อเพื่อหมุนสุ่มตำแหน่งเป้าหมาย (อนิเมชัน)
 *  peek     = สุ่มเสร็จ แตะอีกครั้งเพื่อเปิดฝาดูโซนเป้าหมาย
 *  clue     = คนใบ้เห็นเป้าหมายแล้ว พิมพ์คำใบ้
 *  guessing = คนทายลากเข็มทาย
 *  revealed = เฉลย + คิดคะแนน
 */
export type Phase = 'spin' | 'peek' | 'clue' | 'guessing' | 'revealed'

/** มุมมองที่กำลังดูอยู่ (โหมดเล่นในเครื่องเดียว/hotseat) */
export type View = 'guess' | 'psy'
