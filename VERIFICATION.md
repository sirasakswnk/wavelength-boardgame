# Local verification — 2026-09-10

## Automated checks

- `npm test`: 6 passed (score boundaries, card IDs, membership, stale/unauthorized transitions, four-round game and rematch).
- `npx vitest run tests/rules.test.ts` against the running `demo-wavelength` Database Emulator: 15 passed. Covers unauthenticated access, parent listing, legacy writes, schema corruption/deletion, concurrent joins, seat replacement, hidden/immutable targets, role restrictions, locked guesses, premature advancement, partial/forged scores, every score band, concurrent finalization, stale writes, full game/rematch, and per-tab presence permissions.
- `npm run typecheck`: passed.
- `npm run build`: passed, with no oversized-chunk warning. Main chunk 173.40 kB; game chunk 11.42 kB; Firebase Auth 114.23 kB; Firebase Database 231.14 kB (uncompressed build output). Splitting changes load/cache boundaries; it does not eliminate Firebase's total download size.
- `git diff --check`: no whitespace errors (Git reports the repository's normal LF/CRLF conversion notices).

Tests intentionally issue forbidden writes. Firebase `permission_denied` messages in that test output are expected assertions, not failed game actions.

## Browser exercise

Two separate agent-browser sessions connected only to local Auth/Database Emulators:

1. Host created a four-round room; guest joined; both appeared online and start became available.
2. Host spun a target, refreshed and recovered the same setup step without returning to the home screen. Opened the cover and sent a clue.
3. Guest moved the needle off center, refreshed and recovered it (SVG tip remained at x=317.1438, y=55.1629 instead of the initial x=230, y=34).
4. Guest revealed. Both clients displayed 3 points for the guest. Only host could advance, and round 2 swapped roles.
5. Guest navigated away without intentionally leaving. After Firebase detected the closed connection, host showed the waiting message. Guest reopened the app and recovered round 2 with 3 points and the psychic role.
6. Guest intentionally left. Host saw the closed-room message and could return home.
7. At 360×800, no horizontal overflow or Vite error overlay was found. Browser error collections were empty after the game/reconnect flow.

Screenshots from the local exercise are in ignored `artifacts/`. `scripts/browser-inspect.js` collects visible UI text, dial coordinates, overflow and overlay status for manual browser QA.

## Limits and rollout

- Full-game completion and rematch were automated against game logic and real emulator Rules; the manual browser exercise ran through round 2 and departure.
- Live Firebase rules, hosting and real-device network latency were not changed or tested. Deploy Rules v2 and frontend v2 together using README.md.
- Abrupt disconnect detection is not instant; seats remain reserved until the player intentionally leaves. There is no background cleanup of abandoned rooms.
- Browser sessionStorage restores the room, not an unsent clue draft. Anonymous identity is shared across tabs in one browser profile; use separate profiles for two players.
- Targets are chosen by the psychic's client and then immutable. The project still assumes friends follow clue-giving rules; server-generated targets are outside this implementation.
- The installed Firebase CLI on this Windows machine sometimes left its Java emulator process alive after `emulators:exec` exited. In that case the active emulator was reused for the tests, and only the verified test emulator process was stopped during cleanup.
