# Reliability and security implementation plan

Scope: keep the Thai two-player game and client + Firebase architecture. No live deployment during local implementation.

1. Introduce `roomsV2/{code}/state` for atomic room membership, round transitions and scores. Keep immutable targets under `secret/{roundId}`. Use a fresh round ID for every round, including rematches.
2. Enforce every allowed state transition in database rules. Only the psychic can save a target, once. Members can read it after the guess is locked, so either connected player can finalize an exactly-once score. Validate that score against the stored target in rules.
3. Restore the room per browser tab, initialize local controls from the room, and track each connection separately. A temporary disconnect preserves the seat; intentional departure closes an active game. A guest can leave a lobby without closing it; host departure closes it.
4. Surface failures and retry paths, serialize UI actions, fix typecheck and duplicate cards, remove unused hotseat controls, and defer loading the game screen.
5. Verify pure game transitions and hostile/concurrent writes against the Realtime Database emulator; build and inspect browser flows; update setup/deployment documentation.

Acceptance: unauthorized writes/secret reads fail; concurrent joins cannot overfill; repeated finalization adds points once; stale next-round requests cannot advance another round; rematches reset scores; refresh/disconnect preserves the current game; failures are visible; typecheck/tests/build pass.

Deployment: v2 rules must be deployed with the v2 client. Old room paths are denied by the new rules. Existing games must finish before rollout. Authenticated code holders can read shared state to join via transaction; secret targets and presence remain restricted to members. Parent room listing is denied.

## Local completion (2026-09-10)

All five implementation steps are complete locally. Verification: 6 pure game tests and 15 emulator rules/concurrency tests passed; TypeScript and production build passed; two isolated browser sessions exercised room creation/join, clue, reveal, scoring, role swap, refresh, disconnect/rejoin and intentional departure. A 360px viewport showed no horizontal overflow. Details and limits are recorded in VERIFICATION.md.

No rules or frontend were deployed to the live project. Rollout requires the coordinated steps in README.md.
