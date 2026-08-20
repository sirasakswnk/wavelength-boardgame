// Data layer ของห้องออนไลน์บน Realtime Database
// UI จะเรียกฟังก์ชันเหล่านี้ (สร้าง/เข้าห้อง/เล่น) และ subscribe สถานะห้อง
import {
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  type DataSnapshot,
  type Unsubscribe,
} from 'firebase/database'
import { getFirebase } from './firebase'
import { scoreFor } from './scoring'
import { CARDS, randomCard } from '../data/cards'

export type RoomPhase = 'lobby' | 'setup' | 'guessing' | 'revealed'

/** สิ่งที่คนใบ้กำลังทำอยู่ระหว่างเฟส setup (ให้คนทายเห็นสถานะ) */
export type PsyStatus = 'spinning' | 'peeking' | 'thinking'

export interface RoomPlayer {
  uid: string
  name: string
  avatar: string
  score: number
  slot: number // 0 = โฮสต์, 1 = คนเข้าร่วม
}

export interface RoomPublic {
  phase: RoomPhase
  round: number
  psychicUid: string | null
  cardId: string | null
  clue: string
  needle: number // ตำแหน่งเข็มที่ทาย 0..1
  revealed: boolean
  roundScore: number | null
  targetShown: number | null // เป้าหมายที่เปิดเผยหลังเฉลย
  psyStatus: PsyStatus | null // คนใบ้กำลังทำอะไร (ให้คนทายเห็น)
  hostUid: string
}

export interface RoomSnapshot {
  code: string
  players: RoomPlayer[]
  pub: RoomPublic
}

// ---- helpers ----
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // ตัด 0/O/1/I/L ที่สับสน
function genCode(len = 4): string {
  let s = ''
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return s
}
const db = () => getFirebase().db
const pubRef = (code: string) => ref(db(), `rooms/${code}/public`)
const secretRef = (code: string) => ref(db(), `rooms/${code}/secret/targetPosition`)
const playerRef = (code: string, uid: string) => ref(db(), `rooms/${code}/players/${uid}`)
const presenceRef = (code: string, uid: string) => ref(db(), `rooms/${code}/presence/${uid}`)

function makePublic(hostUid: string): RoomPublic {
  return {
    phase: 'lobby',
    round: 0,
    psychicUid: null,
    cardId: null,
    clue: '',
    needle: 0.5,
    revealed: false,
    roundScore: null,
    targetShown: null,
    psyStatus: null,
    hostUid,
  }
}

// ---- lobby ----
export async function createRoom(uid: string, name: string, avatar: string): Promise<string> {
  let code = genCode()
  for (let i = 0; i < 5; i++) {
    const snap = await get(ref(db(), `rooms/${code}/public`))
    if (!snap.exists()) break
    code = genCode()
  }
  // เขียนแยกเป็นราย path (public + players/uid) เพราะ rules ให้สิทธิ์ที่ระดับลูก ไม่ใช่ที่ rooms/$code
  await update(ref(db(), `rooms/${code}`), {
    public: makePublic(uid),
    [`players/${uid}`]: { uid, name, avatar, score: 0, slot: 0 },
  })
  return code
}

export async function joinRoom(code: string, uid: string, name: string, avatar: string): Promise<void> {
  const pub = await get(pubRef(code))
  if (!pub.exists()) throw new Error('ไม่พบห้องนี้ — เช็กรหัสอีกครั้ง')
  const playersSnap = await get(ref(db(), `rooms/${code}/players`))
  const players = (playersSnap.val() ?? {}) as Record<string, RoomPlayer>
  if (!players[uid] && Object.keys(players).length >= 2) throw new Error('ห้องเต็มแล้ว (2 คน)')
  await set(playerRef(code, uid), {
    uid,
    name,
    avatar,
    score: players[uid]?.score ?? 0,
    slot: players[uid]?.slot ?? 1,
  })
}

export function subscribeRoom(code: string, cb: (room: RoomSnapshot | null) => void): Unsubscribe {
  // อ่านแยก public + players (ห้ามอ่าน rooms/$code ทั้งก้อน — จะติด rules ของ secret)
  let pub: RoomPublic | null = null
  let havePub = false
  let players: RoomPlayer[] = []

  const emit = () => {
    if (havePub && pub) cb({ code, players, pub })
    else cb(null)
  }

  const unsubPub = onValue(pubRef(code), (snap: DataSnapshot) => {
    havePub = snap.exists()
    pub = snap.val() as RoomPublic | null
    emit()
  })
  const unsubPlayers = onValue(ref(db(), `rooms/${code}/players`), (snap: DataSnapshot) => {
    const val = (snap.val() ?? {}) as Record<string, RoomPlayer>
    players = Object.values(val)
      .map((p) => ({ uid: p.uid, name: p.name, avatar: p.avatar, score: p.score ?? 0, slot: p.slot ?? 0 }))
      .sort((a, b) => a.slot - b.slot)
    emit()
  })

  return () => {
    unsubPub()
    unsubPlayers()
  }
}

/** ตั้ง presence + ล้างอัตโนมัติเมื่อเน็ตหลุด; คืนฟังก์ชันออกจาก presence */
export function setupPresence(code: string, uid: string): () => void {
  const pRef = presenceRef(code, uid)
  set(pRef, true)
  onDisconnect(pRef).remove()
  return () => {
    set(pRef, null)
  }
}

export async function leaveRoom(code: string, uid: string): Promise<void> {
  await Promise.all([set(playerRef(code, uid), null), set(presenceRef(code, uid), null)])
}

// ---- รอบเกม ----
/** เริ่มรอบใหม่: สลับคนใบ้ (รอบแรกให้ slot 0 เป็นคนใบ้), สุ่มการ์ด, ล้างของเก่า */
export async function advanceRound(
  code: string,
  current: RoomPublic,
  players: RoomPlayer[],
  firstRound: boolean,
): Promise<void> {
  const prevCard = CARDS.find((c) => c.id === current.cardId)
  const card = randomCard(prevCard)
  let psychicUid: string
  if (firstRound || !current.psychicUid) {
    psychicUid = players[0]?.uid ?? current.hostUid
  } else {
    psychicUid = players.find((p) => p.uid !== current.psychicUid)?.uid ?? current.psychicUid
  }
  await set(secretRef(code), null)
  await update(pubRef(code), {
    phase: 'setup',
    round: (current.round ?? 0) + 1,
    psychicUid,
    cardId: card.id,
    clue: '',
    needle: 0.5,
    revealed: false,
    roundScore: null,
    targetShown: null,
    psyStatus: null,
  })
}

/** คนใบ้อัปเดตสถานะว่ากำลังทำอะไร (ให้คนทายเห็น) */
export function setPsyStatus(code: string, status: PsyStatus | null): Promise<void> {
  return update(pubRef(code), { psyStatus: status })
}

/** คนใบ้บันทึกตำแหน่งเป้าหมายที่สุ่มได้ลง secret (คนทายอ่านไม่ได้) */
export function saveTarget(code: string, target: number): Promise<void> {
  return set(secretRef(code), target)
}

/** คนใบ้อ่านเป้าหมายของตัวเอง (rules ปล่อยเฉพาะคนใบ้) */
export async function getMyTarget(code: string): Promise<number | null> {
  const snap = await get(secretRef(code))
  return snap.exists() ? (snap.val() as number) : null
}

/** คนใบ้ส่งคำใบ้ → เข้าเฟสให้คนทายหมุน */
export function submitClue(code: string, clue: string): Promise<void> {
  return update(pubRef(code), { clue, phase: 'guessing', psyStatus: null })
}

/** คนทายลากเข็ม (ผู้เรียกควร throttle) */
export function submitGuess(code: string, needle: number): Promise<void> {
  return update(pubRef(code), { needle })
}

/** คนทายกดเฉลย → พลิกเฟส (คะแนนให้เครื่องคนใบ้คิดต่อ เพราะมันรู้เป้าหมาย) */
export function revealRound(code: string): Promise<void> {
  return update(pubRef(code), { revealed: true, phase: 'revealed' })
}

/** เครื่องคนใบ้คิดคะแนนตอนเห็นเฟส revealed (มันมีเป้าหมายจริง) */
export async function finalizeScore(
  code: string,
  target: number,
  needle: number,
  guesser: RoomPlayer,
): Promise<void> {
  const sc = scoreFor(needle, target)
  await update(pubRef(code), { targetShown: target, roundScore: sc })
  await update(playerRef(code, guesser.uid), { score: (guesser.score ?? 0) + sc })
}
