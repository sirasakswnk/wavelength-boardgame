import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { advanceState, finalizeState, joinState, makeRoom, leaveState, type RoomState } from '../src/lib/game'
import { CARDS } from '../src/data/cards'

let env: RulesTestEnvironment
const path = 'roomsV2/TEST/state'
const id = (n: number) => String(n).padStart(20,'0')
const db = (uid: string) => env.authenticatedContext(uid).database()
const stateRef = (uid: string) => db(uid).ref(path)
const targetRef = (uid: string, round = 1) => db(uid).ref(`roomsV2/TEST/secret/${id(round)}`)
async function read(uid = 'host'): Promise<RoomState> { return (await stateRef(uid).once('value')).val() }
async function lobby() {
  const host = makeRoom('host','Host','🦊',4,id(0))
  await assertSucceeds(stateRef('host').set(host))
  const joined = joinState(host,'guest','Guest','🐸')
  await assertSucceeds(stateRef('guest').set(joined))
  return joined
}
async function setup() {
  const state = advanceState(await lobby(),'host',id(0),id(1),CARDS[0].id)
  await assertSucceeds(stateRef('host').set(state))
  return state
}
async function guessing() {
  const state = await setup()
  await assertSucceeds(targetRef('host').set(0.5))
  state.pub = { ...state.pub, phase: 'guessing', clue: 'อุ่น', psyStatus: null }
  await assertSucceeds(stateRef('host').set(state))
  return state
}
async function revealed() {
  const state = await guessing()
  state.pub = { ...state.pub, phase: 'revealed', revealed: true, needle: 0.5 }
  await assertSucceeds(stateRef('guest').set(state))
  return state
}

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-wavelength', database: {
    host: '127.0.0.1', port: 9000, rules: readFileSync('firebase/database.rules.json','utf8'),
  } })
})
beforeEach(async () => { await env.clearDatabase() })
afterAll(async () => { await env?.cleanup() })

describe('database authorization and atomicity', () => {
  it('denies anonymous access, room listing, parent reads, and legacy writes', async () => {
    await lobby()
    await assertFails(env.unauthenticatedContext().database().ref(path).once('value'))
    await assertFails(db('host').ref('roomsV2').once('value'))
    await assertFails(db('host').ref('roomsV2/TEST').once('value'))
    await assertFails(db('host').ref('rooms/TEST/public').set({ phase: 'lobby' }))
    await assertSucceeds(stateRef('visitor').once('value')) // code holders need read access to join transaction
  })
  it('denies forged creation, unknown fields, invalid values and deletion', async () => {
    const initial = makeRoom('host','Host','🦊',4,id(0))
    await assertFails(stateRef('guest').set(initial))
    await assertFails(stateRef('host').set({ ...initial, extra: 'bad' }))
    await assertFails(stateRef('host').set({ ...initial, pub: { ...initial.pub, totalRounds: 3 } }))
    await assertFails(stateRef('host').set({ ...initial, players: { host: { ...initial.players.host, score: 99 } } }))
    await assertSucceeds(stateRef('host').set(initial))
    await assertFails(stateRef('host').remove())
    await assertFails(stateRef('host').child('pub/hostUid').remove())
  })
  it('allows only one of two simultaneous joins and preserves the winning seat', async () => {
    await stateRef('host').set(makeRoom('host','Host','🦊',4,id(0)))
    const refs = [stateRef('guest'),stateRef('third')]
    const initial = await Promise.all(refs.map(r => r.once('value')))
    const results = await Promise.allSettled(refs.map((r,i) => r.transaction(raw => {
      const current = raw ?? initial[i].val()
      if (current.players.guest) return undefined
      return joinState(current, i === 0 ? 'guest' : 'third','Guest','🐸')
    }, undefined, false)))
    expect(results.filter(r => r.status === 'fulfilled' && r.value.committed)).toHaveLength(1)
    const state = await read()
    expect(Object.keys(state.players)).toHaveLength(2)
    await assertFails(stateRef('intruder').child('players/guest/uid').set('intruder'))
    await assertFails(stateRef('intruder').child('players/third').set({ uid: 'intruder', name:'X', avatar:'🐸', score:0, slot:2 }))
  })
  it('allows guest lobby exit and replacement, but host exit closes the room', async () => {
    let state = await lobby()
    state = leaveState(state,'guest')
    await assertSucceeds(stateRef('guest').set(state))
    state = joinState(state,'third','Third','🐱')
    await assertSucceeds(stateRef('third').set(state))
    state = leaveState(state,'host')
    await assertSucceeds(stateRef('host').set(state))
    await assertFails(stateRef('third').child('pub/phase').set('lobby'))
  })
  it('restricts setup, target visibility, target immutability and role changes', async () => {
    await setup()
    await assertFails(targetRef('guest').once('value'))
    await assertFails(targetRef('visitor').once('value'))
    await assertFails(targetRef('guest').set(0.2))
    await assertFails(targetRef('host').set(0.9))
    await assertSucceeds(targetRef('host').set(0.5))
    await assertSucceeds(targetRef('host').set(0.5))
    await assertFails(targetRef('host').set(0.2))
    await assertFails(targetRef('host').remove())
    await assertFails(stateRef('guest').child('pub/psychicUid').set('guest'))
    await assertFails(stateRef('host').child('pub/hostUid').set('guest'))
    await assertFails(stateRef('guest').child('pub/psyStatus').set('thinking'))
    await assertSucceeds(stateRef('host').child('pub/psyStatus').set('thinking'))
  })
  it('requires a saved target before clue, and validates clue/guess roles', async () => {
    let state = await setup()
    state.pub = { ...state.pub, phase:'guessing', clue:'อุ่น' }
    await assertFails(stateRef('host').set(state))
    await targetRef('host').set(0.5)
    await assertFails(stateRef('guest').set(state))
    await assertSucceeds(stateRef('host').set(state))
    await assertFails(stateRef('host').child('pub/needle').set(0.7))
    await assertFails(stateRef('guest').child('pub/needle').set(1.1))
    await assertSucceeds(stateRef('guest').child('pub/needle').set(0.7))
    await assertFails(stateRef('guest').child('pub/clue').set('cheat'))
  })
  it('locks the guess before exposing target and refuses premature next round', async () => {
    let state = await guessing()
    await assertFails(targetRef('guest').once('value'))
    state.pub = { ...state.pub, phase:'revealed', revealed:true, needle:0.54 }
    await assertFails(stateRef('host').set(state))
    await assertSucceeds(stateRef('guest').set(state))
    await assertSucceeds(targetRef('guest').once('value'))
    await assertFails(targetRef('visitor').once('value'))
    await assertFails(stateRef('guest').child('pub/needle').set(0.5))
    await assertFails(stateRef('host').child('pub/phase').set('setup'))
  })
  it('validates score against secret and rejects incomplete or tampered scoring', async () => {
    const state = await revealed()
    const scored = finalizeState(state,'guest',id(1),0.5)
    await assertFails(stateRef('visitor').set(scored))
    await assertFails(stateRef('host').child('pub').set(scored.pub))
    await assertFails(stateRef('host').set({ ...scored, pub: { ...scored.pub, targetShown:0.6 } }))
    await assertFails(stateRef('host').set({ ...scored, players: { ...scored.players, host: { ...scored.players.host, score:4 } } }))
    await assertSucceeds(stateRef('guest').set(scored))
    await assertFails(stateRef('guest').child('players/guest/score').set(8))
  })
  it.each([[0.5,4],[0.55,3],[0.6,2],[0.9,0]])('validates scoring band at needle %s', async (needle, expected) => {
    const state = await guessing()
    state.pub = { ...state.pub, phase:'revealed', revealed:true, needle }
    await assertSucceeds(stateRef('guest').set(state))
    const scored = finalizeState(state,'guest',id(1),0.5)
    expect(scored.pub.roundScore).toBe(expected)
    await assertFails(stateRef('host').set({ ...scored, pub: { ...scored.pub, roundScore: expected === 4 ? 3 : 4 } }))
    await assertSucceeds(stateRef('guest').set(scored))
  })
  it('finalizes once with simultaneous clients, then rejects stale next-round writes', async () => {
    await revealed()
    const refs = [stateRef('host'),stateRef('guest')]
    const initial = await Promise.all(refs.map(r => r.once('value')))
    await Promise.all(refs.map((r,i) => r.transaction(raw => finalizeState(raw ?? initial[i].val(),i ? 'guest':'host',id(1),0.5), undefined, false)))
    const state = await read()
    expect(state.players.guest?.score).toBe(4)
    const next = advanceState(state,'host',id(1),id(2),CARDS[1].id)
    await assertFails(stateRef('guest').set(next))
    await assertSucceeds(stateRef('host').set(next))
    await assertFails(stateRef('host').set({ ...next, pub:{ ...next.pub, round:3, roundId:id(3) } }))
    await assertFails(targetRef('host',1).once('value'))
    await assertFails(targetRef('host',2).once('value'))
    await assertSucceeds(targetRef('guest',2).set(0.6))
  })
  it('plays all rounds and rematch with correct role rotation and reset', async () => {
    let state = await lobby()
    for (let i=1;i<=4;i++) {
      state = advanceState(state,'host',state.pub.roundId,id(i),CARDS[i].id)
      await assertSucceeds(stateRef('host').set(state))
      const psychic = state.pub.psychicUid!
      const guesser = psychic === 'host' ? 'guest':'host'
      await assertSucceeds(targetRef(psychic,i).set(0.5))
      state.pub = { ...state.pub, phase:'guessing', clue:'อุ่น' }
      await assertSucceeds(stateRef(psychic).set(state))
      state.pub = { ...state.pub, phase:'revealed', revealed:true }
      await assertSucceeds(stateRef(guesser).set(state))
      state = finalizeState(state,guesser,id(i),0.5)
      await assertSucceeds(stateRef(guesser).set(state))
    }
    state = advanceState(state,'host',id(4),id(5),CARDS[0].id)
    await assertSucceeds(stateRef('host').set(state))
    expect(state.pub.phase).toBe('ended')
    state = advanceState(state,'host',id(4),id(6),CARDS[0].id,true)
    await assertSucceeds(stateRef('host').set(state))
    expect((await read()).players.guest?.score).toBe(0)
    expect(state.pub.game).toBe(2)
  })
  it('only allows own connection entries and keeps them isolated per tab', async () => {
    await lobby()
    const mine = db('host').ref('roomsV2/TEST/presence/host')
    await assertSucceeds(mine.child('tab1').set(true))
    await assertSucceeds(mine.child('tab2').set(true))
    await assertFails(db('guest').ref('roomsV2/TEST/presence/host/tab1').remove())
    await assertFails(db('outsider').ref('roomsV2/TEST/presence/outsider/tab1').set(true))
    await assertSucceeds(mine.child('tab1').remove())
    expect((await mine.once('value')).val()).toEqual({tab2:true})
  })
})
