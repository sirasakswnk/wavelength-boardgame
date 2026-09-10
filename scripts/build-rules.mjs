// Generate explicit field comparisons: RTDB rules have no reusable functions.
// Keep the checked-in JSON deployable without running this script in production.
import { readFileSync, writeFileSync } from 'node:fs'
const pubFields = ['phase', 'round', 'game', 'roundId', 'totalRounds', 'psychicUid', 'cardId', 'clue', 'needle', 'revealed', 'roundScore', 'targetShown', 'psyStatus', 'hostUid']
const playerFields = ['uid', 'name', 'avatar', 'score', 'slot']
const paths = [...pubFields.map(k => `pub/${k}`), ...['host', 'guest'].flatMap(s => playerFields.map(k => `players/${s}/${k}`))]
const d = p => `data.child('${p}').val()`
const n = p => `newData.child('${p}').val()`
const and = (...xs) => `(${xs.flat().filter(Boolean).join(' && ')})`
const or = (...xs) => `(${xs.flat().filter(Boolean).join(' || ')})`
const eq = (p, value) => `${n(p)} === ${value}`
const sameExcept = (...allow) => and(paths.filter(p => !allow.includes(p)).map(p => eq(p, d(p))))
const room = "root.child('roomsV2').child($code)"
const member = or(`${d('players/host/uid')} === auth.uid`, `${d('players/guest/uid')} === auth.uid`)
const phase = value => `${d('pub/phase')} === '${value}'`
const host = `${d('pub/hostUid')} === auth.uid`
const psychic = `(${d('pub/psychicUid')} === auth.uid)`
const secret = `${room}.child('secret').child(${d('pub/roundId')})`
const guestPaths = playerFields.map(k => `players/guest/${k}`)
const scores = ['players/host/score', 'players/guest/score']
const nulls = ['psychicUid', 'cardId', 'roundScore', 'targetShown', 'psyStatus']
const zeroRound = and(eq('pub/clue', "''"), eq('pub/needle', '0.5'), eq('pub/revealed', 'false'),
  ['roundScore','targetShown','psyStatus'].map(k => eq(`pub/${k}`, 'null')))
const create = and('!data.exists()', eq('pub/phase', "'lobby'"), eq('pub/round', '0'), eq('pub/game', '1'),
  eq('pub/hostUid', 'auth.uid'), eq('players/host/uid', 'auth.uid'), eq('players/host/score','0'),
  "!newData.child('players/guest').exists()", nulls.map(k => eq(`pub/${k}`, 'null')), zeroRound)
const join = and(phase('lobby'), "!data.child('players/guest').exists()", eq('players/guest/uid', 'auth.uid'),
  `auth.uid !== ${d('players/host/uid')}`, eq('players/guest/score', '0'), sameExcept(...guestPaths))
const leaveGuest = and(phase('lobby'), `${d('players/guest/uid')} === auth.uid`,
  "!newData.child('players/guest').exists()", sameExcept(...guestPaths))
const close = and(member, `${d('pub/phase')} !== 'closed'`, eq('pub/phase', "'closed'"), sameExcept('pub/phase'))
const ready = and(phase('revealed'), "data.child('pub/roundScore').exists()", "data.child('pub/targetShown').exists()")
const next = and(host, "data.child('players/guest').exists()", or(phase('lobby'), and(ready, `${d('pub/round')} < ${d('pub/totalRounds')}`)),
  eq('pub/phase', "'setup'"), eq('pub/round', `${d('pub/round')} + 1`),
  eq('pub/psychicUid', `(${phase('lobby')} ? ${d('pub/hostUid')} : (${d('pub/psychicUid')} === ${d('players/host/uid')} ? ${d('players/guest/uid')} : ${d('players/host/uid')}))`),
  sameExcept(...pubFields.filter(k => !['hostUid', 'totalRounds', 'game'].includes(k)).map(k => `pub/${k}`)), zeroRound)
const restart = and(host, phase('ended'), eq('pub/phase', "'setup'"), eq('pub/game', `${d('pub/game')} + 1`), eq('pub/round', '1'),
  eq('pub/psychicUid', d('pub/hostUid')), scores.map(p => eq(p, '0')),
  sameExcept(...pubFields.filter(k => !['hostUid', 'totalRounds'].includes(k)).map(k => `pub/${k}`), ...scores), zeroRound)
const freshRound = and("newData.child('pub/cardId').exists()", `${n('pub/roundId')} !== ${d('pub/roundId')}`, `!${room}.child('secret').child(${n('pub/roundId')}).exists()`)
const end = and(host, ready, `${d('pub/round')} === ${d('pub/totalRounds')}`, eq('pub/phase', "'ended'"), sameExcept('pub/phase'))
const status = and(member, psychic, phase('setup'), sameExcept('pub/psyStatus'))
const clue = and(member, psychic, phase('setup'), `${secret}.exists()`, eq('pub/phase', "'guessing'"),
  `${n('pub/clue')}.length > 0`, eq('pub/psyStatus', 'null'), sameExcept('pub/phase','pub/clue','pub/psyStatus'))
const guess = and(member, `!${psychic}`, phase('guessing'), sameExcept('pub/needle'))
const reveal = and(member, `!${psychic}`, phase('guessing'), eq('pub/phase', "'revealed'"), eq('pub/revealed', 'true'), sameExcept('pub/phase','pub/revealed','pub/needle'))
const diff = `(${d('pub/needle')} - ${secret}.val())`
const band = b => and(`${diff} >= -${b}`, `${diff} <= ${b}`)
const expected = `(${band(0.032)} ? 4 : (${band(0.078)} ? 3 : (${band(0.132)} ? 2 : 0)))`
const finalize = and(member, phase('revealed'), "!data.child('pub/roundScore').exists()", `${secret}.exists()`,
  eq('pub/targetShown', `${secret}.val()`), eq('pub/roundScore', expected),
  scores.map(p => eq(p, `${d(p)} + (${d(p.replace('/score','/uid'))} !== ${d('pub/psychicUid')} ? ${n('pub/roundScore')} : 0)`)),
  sameExcept('pub/targetShown','pub/roundScore', ...scores))
const noOp = and(member, sameExcept())
const cards = [...readFileSync('src/data/cards.ts','utf8').matchAll(/id: '([^']+)'/g)].map(m => m[1])
const string = (min, max) => `newData.isString() && newData.val().length >= ${min} && newData.val().length <= ${max}`
const number = (min,max) => `newData.isNumber() && newData.val() >= ${min} && newData.val() <= ${max}`
const oneOf = values => or(values.map(v => `newData.val() === ${JSON.stringify(v)}`))
const avatars = ['🦊','🐸','🐱','🐰','🐼','🦁','Pinkbutterfly.png','Purplebutterfly.png']
const player = slot => ({ '.validate': "newData.hasChildren(['uid','name','avatar','score','slot'])",
  uid: { '.validate': string(1,128) }, name: { '.validate': string(1,16) }, avatar: { '.validate': oneOf(avatars) },
  score: { '.validate': `${number(0,40)} && newData.val() % 1 === 0` }, slot: { '.validate': `newData.val() === ${slot}` }, '$other': { '.validate': false } })
const state = {
  '.read': 'auth != null',
  '.write': and('auth != null', 'newData.exists()', or(create, and('data.exists()', or(join,leaveGuest,close,and(or(next,restart),freshRound),end,status,clue,guess,reveal,finalize,noOp)))),
  '.validate': "newData.hasChildren(['pub','players']) && newData.child('pub/hostUid').val() === newData.child('players/host/uid').val() && (!newData.child('players/guest').exists() || newData.child('players/guest/uid').val() !== newData.child('players/host/uid').val()) && (newData.child('pub/phase').val() === 'lobby' || newData.child('pub/phase').val() === 'closed' || newData.child('players/guest').exists())",
  pub: {
    '.validate': "newData.hasChildren(['phase','round','game','roundId','totalRounds','clue','needle','revealed','hostUid'])",
    phase: { '.validate': oneOf(['lobby','setup','guessing','revealed','ended','closed']) },
    round: { '.validate': `${number(0,10)} && newData.val() % 1 === 0` },
    game: { '.validate': `${number(1,1000000)} && newData.val() % 1 === 0` },
    roundId: { '.validate': "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{20}$/)" },
    totalRounds: { '.validate': oneOf([4,6,8,10]) },
    psychicUid: { '.validate': string(1,128) }, cardId: { '.validate': oneOf(cards) },
    clue: { '.validate': string(0,100) }, needle: { '.validate': number(0,1) }, revealed: { '.validate': 'newData.isBoolean()' },
    roundScore: { '.validate': oneOf([0,2,3,4]) }, targetShown: { '.validate': number(0.15,0.85) },
    psyStatus: { '.validate': oneOf(['spinning','peeking','thinking']) }, hostUid: { '.validate': string(1,128) }, '$other': { '.validate': false },
  },
  players: { '.validate': "newData.hasChildren(['host'])", host: player(0), guest: player(1), '$other': { '.validate': false } },
  '$other': { '.validate': false },
}
const shared = `${room}.child('state')`
const isMember = or(`${shared}.child('players/host/uid').val() === auth.uid`, `${shared}.child('players/guest/uid').val() === auth.uid`)
const rules = { rules: { '.read': false, '.write': false, roomsV2: { '$code': {
  state,
  secret: { '$roundId': {
    '.read': and('auth != null', isMember, `${shared}.child('pub/roundId').val() === $roundId`, or(`${shared}.child('pub/psychicUid').val() === auth.uid`, `${shared}.child('pub/phase').val() === 'revealed'`, `${shared}.child('pub/phase').val() === 'ended'`)),
    '.write': and('auth != null', isMember, `${shared}.child('pub/roundId').val() === $roundId`, `${shared}.child('pub/phase').val() === 'setup'`, `${shared}.child('pub/psychicUid').val() === auth.uid`, 'newData.exists()', or('!data.exists()', 'newData.val() === data.val()')),
    '.validate': number(0.15,0.85),
  } },
  presence: { '.read': and('auth != null', isMember), '$uid': { '$connection': {
    '.write': and('auth != null', 'auth.uid === $uid', or('!newData.exists()', and(isMember, `${shared}.child('pub/phase').val() !== 'closed'`))),
    '.validate': 'newData.val() === true',
  } } },
} } } }
writeFileSync('firebase/database.rules.json', JSON.stringify(rules,null,2) + '\n')
