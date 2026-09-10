import { CARDS } from '../data/cards'
import { scoreFor } from './scoring'

export const ROUND_OPTIONS = [4, 6, 8, 10] as const
export const DEFAULT_ROUNDS = 6
export type RoomPhase = 'lobby' | 'setup' | 'guessing' | 'revealed' | 'ended' | 'closed'
export type PsyStatus = 'spinning' | 'peeking' | 'thinking'
export interface RoomPlayer { uid: string; name: string; avatar: string; score: number; slot: number }
export interface RoomPublic {
  phase: RoomPhase
  round: number
  game: number
  roundId: string
  totalRounds: number
  psychicUid: string | null
  cardId: string | null
  clue: string
  needle: number
  revealed: boolean
  roundScore: number | null
  targetShown: number | null
  psyStatus: PsyStatus | null
  hostUid: string
}
export interface RoomState { pub: RoomPublic; players: { host: RoomPlayer; guest?: RoomPlayer } }
export interface RoomSnapshot {
  code: string
  pub: RoomPublic
  players: RoomPlayer[]
  online: Record<string, boolean>
}

export function requireGame(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
export function members(state: RoomState): RoomPlayer[] {
  return [state.players.host, state.players.guest].filter((p): p is RoomPlayer => !!p)
}
export function requireMember(state: RoomState, uid: string) {
  requireGame(members(state).some(p => p.uid === uid), 'คุณไม่ได้อยู่ในห้องนี้')
  requireGame(state.pub.phase !== 'closed', 'ห้องนี้ปิดแล้ว')
}
export function requireRound(state: RoomState, uid: string, roundId: string) {
  requireMember(state, uid)
  requireGame(state.pub.roundId === roundId, 'รอบเปลี่ยนแล้ว กรุณาลองอีกครั้ง')
}
export function makeRoom(uid: string, name: string, avatar: string, totalRounds: number, roundId: string): RoomState {
  requireGame(ROUND_OPTIONS.some(n => n === totalRounds), 'จำนวนรอบไม่ถูกต้อง')
  requireGame(name.trim().length > 0 && name.trim().length <= 16, 'กรุณาใส่ชื่อ 1–16 ตัวอักษร')
  return {
    pub: { phase: 'lobby', round: 0, game: 1, roundId, totalRounds, psychicUid: null,
      cardId: null, clue: '', needle: 0.5, revealed: false, roundScore: null,
      targetShown: null, psyStatus: null, hostUid: uid },
    players: { host: { uid, name: name.trim(), avatar, score: 0, slot: 0 } },
  }
}
export function joinState(state: RoomState, uid: string, name: string, avatar: string): RoomState {
  requireGame(state.pub.phase !== 'closed', 'ห้องนี้ปิดแล้ว')
  if (members(state).some(p => p.uid === uid)) return state
  requireGame(state.pub.phase === 'lobby', 'ห้องนี้เริ่มเล่นแล้ว')
  requireGame(!state.players.guest, 'ห้องเต็มแล้ว (2 คน)')
  requireGame(name.trim().length > 0 && name.trim().length <= 16, 'กรุณาใส่ชื่อ 1–16 ตัวอักษร')
  return { ...state, players: { ...state.players, guest: { uid, name: name.trim(), avatar, score: 0, slot: 1 } } }
}
export function leaveState(state: RoomState, uid: string): RoomState {
  if (state.pub.phase === 'closed') return state
  requireMember(state, uid)
  if (state.pub.phase === 'lobby' && state.players.guest?.uid === uid) {
    return { ...state, players: { host: state.players.host } }
  }
  return { ...state, pub: { ...state.pub, phase: 'closed' } }
}
export function advanceState(state: RoomState, uid: string, expectedId: string, nextId: string, cardId: string, restart = false): RoomState {
  requireRound(state, uid, expectedId)
  const { pub } = state
  requireGame(uid === pub.hostUid, 'เฉพาะโฮสต์เปลี่ยนรอบได้')
  requireGame(!!state.players.guest, 'ต้องมีผู้เล่นครบ 2 คน')
  requireGame(restart ? pub.phase === 'ended' : pub.phase === 'lobby' || (pub.phase === 'revealed' && pub.roundScore != null && pub.targetShown != null), 'รอให้บันทึกคะแนนเสร็จก่อน')
  if (!restart && pub.round >= pub.totalRounds) return { ...state, pub: { ...pub, phase: 'ended' } }
  requireGame(CARDS.some(c => c.id === cardId) && nextId !== expectedId, 'ข้อมูลรอบไม่ถูกต้อง')
  const psychicUid = restart || pub.phase === 'lobby' ? pub.hostUid : members(state).find(p => p.uid !== pub.psychicUid)!.uid
  const players = restart ? {
    host: { ...state.players.host, score: 0 }, guest: { ...state.players.guest!, score: 0 },
  } : state.players
  return { players, pub: { ...pub, phase: 'setup', game: pub.game + (restart ? 1 : 0), round: restart ? 1 : pub.round + 1,
    roundId: nextId, psychicUid, cardId, clue: '', needle: 0.5, revealed: false,
    roundScore: null, targetShown: null, psyStatus: null } }
}
export function finalizeState(state: RoomState, uid: string, expectedId: string, target: number): RoomState {
  requireRound(state, uid, expectedId)
  requireGame(state.pub.phase === 'revealed', 'ยังไม่ได้ล็อกคำตอบ')
  if (state.pub.roundScore != null) return state
  requireGame(Number.isFinite(target) && target >= 0.15 && target <= 0.85, 'ไม่พบเป้าหมายของรอบนี้')
  const score = scoreFor(state.pub.needle, target)
  const slot = state.players.host.uid === state.pub.psychicUid ? 'guest' : 'host'
  const guesser = state.players[slot]
  requireGame(guesser, 'ไม่พบคนทาย')
  return { pub: { ...state.pub, targetShown: target, roundScore: score },
    players: { ...state.players, [slot]: { ...guesser, score: guesser.score + score } } }
}
