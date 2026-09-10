import { ref, get, set, onValue, onDisconnect, push, runTransaction, type Unsubscribe } from 'firebase/database'
import { getFirebase } from './firebase'
import { CARDS, randomCard } from '../data/cards'
import { advanceState, finalizeState, joinState, leaveState, makeRoom, requireGame, requireRound,
  type RoomState, type RoomSnapshot, type RoomPublic, type PsyStatus } from './game'
export { DEFAULT_ROUNDS, ROUND_OPTIONS } from './game'
export type { RoomPlayer, RoomPublic, RoomSnapshot, RoomPhase, PsyStatus } from './game'

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const db = () => getFirebase().db
const roomPath = (code: string) => `roomsV2/${code}`
const stateRef = (code: string) => ref(db(), `${roomPath(code)}/state`)
const secretRef = (code: string, roundId: string) => ref(db(), `${roomPath(code)}/secret/${roundId}`)
const currentUid = () => {
  const uid = getFirebase().auth.currentUser?.uid
  requireGame(uid, 'กรุณารอเชื่อมต่อบัญชีผู้เล่น')
  return uid
}
function genCode() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), n => CODE_CHARS[n % CODE_CHARS.length]).join('')
}
function nextId() { return push(ref(db(), 'unused')).key! }

/** Shared game changes use one transaction boundary. Never mix set/update here. */
async function change(code: string, transform: (state: RoomState) => RoomState): Promise<void> {
  const initial = await get(stateRef(code))
  requireGame(initial.exists(), 'ไม่พบห้องนี้')
  // A one-off get does not guarantee a retained local cache. Seed the first attempt;
  // the server's compare-and-swap still retries against its latest state on conflict.
  const result = await runTransaction(stateRef(code), raw => transform((raw ?? initial.val()) as RoomState), { applyLocally: false })
  requireGame(result.committed, 'ห้องเปลี่ยนแปลง กรุณาลองอีกครั้ง')
}
export async function createRoom(uid: string, name: string, avatar: string, rounds: number): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = genCode()
    const state = makeRoom(uid, name, avatar, rounds, nextId())
    const result = await runTransaction(stateRef(code), old => old == null ? state : undefined, { applyLocally: false })
    if (result.committed) return code
  }
  throw new Error('สร้างรหัสห้องไม่สำเร็จ กรุณาลองอีกครั้ง')
}
export async function joinRoom(code: string, uid: string, name: string, avatar: string) {
  requireGame(/^[A-Z0-9]{4}$/.test(code), 'รหัสห้องต้องมี 4 ตัว')
  await change(code, state => joinState(state, uid, name, avatar))
}
export function subscribeRoom(code: string, cb: (room: RoomSnapshot | null) => void, onError: (error: Error) => void): Unsubscribe {
  let state: RoomState | null = null
  let online: Record<string, boolean> = {}
  let presenceUnsub: Unsubscribe | undefined
  const emit = () => cb(state ? { code, pub: state.pub,
    players: [state.players.host, state.players.guest].filter(p => !!p), online } : null)
  const unsub = onValue(stateRef(code), snap => {
    state = snap.val() as RoomState | null
    const isMember = state && [state.players.host, state.players.guest].some(p => p?.uid === currentUid())
    if (isMember && !presenceUnsub) {
      presenceUnsub = onValue(ref(db(), `${roomPath(code)}/presence`), presence => {
        online = Object.fromEntries(Object.entries(presence.val() ?? {}).map(([uid, connections]) => [uid, !!connections && Object.keys(connections).length > 0]))
        emit()
      }, onError)
    } else if (!isMember && presenceUnsub) {
      presenceUnsub()
      presenceUnsub = undefined
    }
    emit()
  }, onError)
  return () => { unsub(); presenceUnsub?.() }
}
/** Register disconnect cleanup before publishing online; each tab has its own entry. */
export function setupPresence(code: string, uid: string, onError: (error: Error) => void): () => void {
  let active = true
  let cleanupConnection: (() => Promise<void>) | undefined
  const unsub = onValue(ref(db(), '.info/connected'), snapshot => {
    if (!snapshot.val()) return
    const connection = push(ref(db(), `${roomPath(code)}/presence/${uid}`))
    const disconnect = onDisconnect(connection)
    cleanupConnection = async () => { await set(connection, null); await disconnect.cancel() }
    void (async () => {
      await disconnect.remove()
      if (!active) { await disconnect.cancel(); return }
      await set(connection, true)
      if (!active) { await set(connection, null); await disconnect.cancel() }
    })().catch(onError)
  }, onError)
  return () => { active = false; unsub(); void cleanupConnection?.().catch(onError) }
}
export async function leaveRoom(code: string, uid: string) {
  await change(code, state => leaveState(state, uid))
}
export async function advanceRound(code: string, current: RoomPublic) {
  const uid = currentUid()
  const card = randomCard(CARDS.find(c => c.id === current.cardId))
  const id = nextId()
  await change(code, state => advanceState(state, uid, current.roundId, id, card.id))
}
export async function restartGame(code: string, current: RoomPublic) {
  const uid = currentUid()
  const id = nextId()
  const card = randomCard()
  await change(code, state => advanceState(state, uid, current.roundId, id, card.id, true))
}
export function setPsyStatus(code: string, roundId: string, status: PsyStatus) {
  const uid = currentUid()
  return change(code, state => {
    requireRound(state, uid, roundId)
    requireGame(state.pub.phase === 'setup' && state.pub.psychicUid === uid, 'ตอนนี้เปลี่ยนสถานะคนใบ้ไม่ได้')
    return { ...state, pub: { ...state.pub, psyStatus: status } }
  })
}
export async function saveTarget(code: string, roundId: string, target: number): Promise<number> {
  const result = await runTransaction(secretRef(code, roundId), old => old ?? target, { applyLocally: false })
  return result.snapshot.val() as number
}
export async function getMyTarget(code: string, roundId: string): Promise<number | null> {
  return (await get(secretRef(code, roundId))).val() as number | null
}
export function submitClue(code: string, roundId: string, clue: string) {
  const uid = currentUid()
  return change(code, state => {
    requireRound(state, uid, roundId)
    requireGame(state.pub.phase === 'setup' && state.pub.psychicUid === uid, 'ตอนนี้ส่งคำใบ้ไม่ได้')
    requireGame(clue.trim().length > 0 && clue.trim().length <= 100, 'กรุณาใส่คำใบ้ 1–100 ตัวอักษร')
    return { ...state, pub: { ...state.pub, clue: clue.trim(), phase: 'guessing', psyStatus: null } }
  })
}
export function submitGuess(code: string, roundId: string, needle: number, reveal = false) {
  const uid = currentUid()
  return change(code, state => {
    requireRound(state, uid, roundId)
    requireGame(state.pub.phase === 'guessing' && state.pub.psychicUid !== uid, 'คำตอบถูกล็อกแล้ว หรือยังไม่ถึงตาคุณ')
    requireGame(Number.isFinite(needle) && needle >= 0 && needle <= 1, 'ตำแหน่งเข็มไม่ถูกต้อง')
    return { ...state, pub: { ...state.pub, needle, ...(reveal ? { revealed: true, phase: 'revealed' as const } : {}) } }
  })
}
export async function finalizeScore(code: string, roundId: string): Promise<void> {
  const uid = currentUid()
  const target = await getMyTarget(code, roundId)
  requireGame(target != null, 'ไม่พบเป้าหมายของรอบนี้')
  await change(code, state => finalizeState(state, uid, roundId, target))
}
