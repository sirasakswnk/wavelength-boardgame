import { describe, expect, it } from 'vitest'
import { advanceState, finalizeState, joinState, leaveState, makeRoom } from '../src/lib/game'
import { CARDS, randomCard } from '../src/data/cards'
import { BANDS, randomTarget, scoreFor } from '../src/lib/scoring'

const room = () => joinState(makeRoom('host','Host','🦊',4,'initial'), 'guest','Guest','🐸')
describe('game invariants', () => {
  it('awards only the guesser and ignores repeated finalization', () => {
    const state = advanceState(room(),'host','initial','round1',CARDS[0].id)
    state.pub.phase = 'revealed'
    state.pub.revealed = true
    const scored = finalizeState(state,'guest','round1',0.5)
    expect(scored.players.host.score).toBe(0)
    expect(scored.players.guest?.score).toBe(4)
    expect(finalizeState(scored,'host','round1',0.5)).toEqual(scored)
    expect(() => finalizeState(state,'outsider','round1',0.5)).toThrow()
  })
  it('rejects unscored, stale and unauthorized advances', () => {
    const state = advanceState(room(),'host','initial','round1',CARDS[0].id)
    state.pub.phase = 'revealed'
    expect(() => advanceState(state,'host','round1','round2',CARDS[1].id)).toThrow()
    const scored = finalizeState(state,'host','round1',0.5)
    const next = advanceState(scored,'host','round1','round2',CARDS[1].id)
    expect(next.pub.psychicUid).toBe('guest')
    expect(() => advanceState(next,'host','round1','round3',CARDS[0].id)).toThrow()
    expect(() => advanceState(scored,'guest','round1','round2',CARDS[1].id)).toThrow()
  })
  it('completes a full game and resets scores with a new identity on rematch', () => {
    let state = room()
    for (let i = 1; i <= 4; i++) {
      state = advanceState(state,'host',state.pub.roundId,`round${i}`,CARDS[i].id)
      state.pub.phase = 'revealed'
      state.pub.revealed = true
      state = finalizeState(state,'host',state.pub.roundId,0.5)
    }
    expect(state.players.host.score).toBe(8)
    expect(state.players.guest?.score).toBe(8)
    state = advanceState(state,'host',state.pub.roundId,'unused',CARDS[0].id)
    expect(state.pub.phase).toBe('ended')
    const restarted = advanceState(state,'host',state.pub.roundId,'rematch',CARDS[0].id,true)
    expect(restarted.pub).toMatchObject({ round: 1, game: 2, roundId: 'rematch', psychicUid: 'host' })
    expect(restarted.players.host.score + restarted.players.guest!.score).toBe(0)
  })
  it('preserves returning members and rejects replacement/extra players', () => {
    const state = room()
    expect(joinState(state,'guest','Changed','🐱')).toEqual(state)
    expect(() => joinState(state,'third','Third','🐱')).toThrow()
    const active = advanceState(state,'host','initial','round1',CARDS[0].id)
    expect(() => joinState(active,'third','Third','🐱')).toThrow()
  })
  it('guest departure frees a lobby seat; other departures close the game', () => {
    expect(leaveState(room(),'guest').players.guest).toBeUndefined()
    expect(leaveState(room(),'host').pub.phase).toBe('closed')
    const active = advanceState(room(),'host','initial','round1',CARDS[0].id)
    expect(leaveState(active,'guest').pub.phase).toBe('closed')
    expect(() => joinState(leaveState(active,'guest'),'third','Third','🐱')).toThrow()
  })
  it('keeps scoring boundaries, random ranges and card IDs consistent', () => {
    for (const [distance, score] of [[0,4],[BANDS.b4,4],[BANDS.b4+0.0001,3],[BANDS.b3,3],[BANDS.b3+0.0001,2],[BANDS.b2,2],[BANDS.b2+0.0001,0]]) {
      expect(scoreFor(distance,0)).toBe(score)
    }
    expect(new Set(CARDS.map(c => c.id)).size).toBe(CARDS.length)
    for (let i=0;i<100;i++) {
      expect(randomTarget()).toBeGreaterThanOrEqual(0.15)
      expect(randomTarget()).toBeLessThanOrEqual(0.85)
      expect(randomCard(CARDS[0]).id).not.toBe(CARDS[0].id)
    }
  })
})
