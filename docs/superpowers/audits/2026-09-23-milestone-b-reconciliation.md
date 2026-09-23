# Milestone B → Stabilized C Reconciliation Audit

Date: 2026-09-23
Canonical branch: `stabilize/milestone-c`
Historical branch: `feature/milestone-b-multiplayer-core`
Merge base: `77d57842989e62c054008869eb0775eb9a12f437`

| Functional group | Classification | Evidence |
| --- | --- | --- |
| 20-second timer and bot timeout fallback | Already covered | `src/timer/multiplayer-timeout.ts` is identical between B and stabilized C; timer unit tests are retained. |
| Human timeout fallback | Superseded | B auto-play/auto-take expectations conflict with the v1 rule; stabilized C ends the human match as a technical loss. |
| Visibility/focus timer lifecycle | Already covered | Current UI tests cover hidden-page pausing and animation-ending-while-blurred behavior. |
| Public `lastTakeEvent` | Already covered | Current state, public view, resolution, save validation, and tests retain the B behavior. |
| Bot learning from resolved takes | Already covered | `src/controllers/multiplayer-bot-memory.ts` and its tests are identical between B and stabilized C. |
| Hidden-information boundary | Already covered | Current public-view and bot-memory tests verify own-hand/public-information boundaries. |
| Canonical card identity validation | Already covered | Classic save validation is identical; multiplayer validation retains the same rule and adds variant validation/migration. |
| Multiplayer save/resume stress | Already covered, strengthened in Task 2 | Current suite covers both variants for 3/4 players; Task 2 adds explicit 2-player coverage for both variants. |
| Perevodnoy variant/transfer support | Newer C-only capability | Must remain; B contains no equivalent and cannot replace these paths. |
| Current menu / technical-loss result flow | Newer C-only capability | Must remain; B must not overwrite these paths. |

## File-level evidence

The following production files are byte-identical between B and stabilized C:

- `src/controllers/multiplayer-bot-memory.ts`
- `src/rules/multiplayer-resolution.ts`
- `src/save/match-save.ts`
- `src/timer/multiplayer-timeout.ts`
- `src/ui/multiplayer-table.css`

The following stabilized-C files are B behavior plus required newer functionality:

- `src/core/multiplayer-game-types.ts` — adds `variant`.
- `src/core/multiplayer-public-view.ts` — retains `lastTakeEvent` and exposes `variant`.
- `src/rules/create-multiplayer-match.ts` — retains take-event initialization and adds selectable variant.
- `src/save/multiplayer-match-save.ts` — retains take-event/card validation and adds variant validation plus legacy migration.
- `src/ui/MultiplayerTableScreen.tsx` — retains timer/focus infrastructure and adds technical-loss semantics plus Perevodnoy transfer UI.

## Decision

No Milestone B production commit requires cherry-picking into the canonical line.

PR #4 may be closed as superseded only after the verification gate in this reconciliation plan succeeds on the exact canonical HEAD.


## Execution ruling

This session has no local repository checkout available for direct shell execution of the plan's focused commands. Verification therefore used the repository's `Milestone C CI` workflow on the exact branch HEAD under Node 22. The workflow runs the complete Vitest suite, TypeScript typecheck, and production build; the job logs were inspected for each focused test file named by the plan.

Cost if wrong: an environment-specific issue that reproduces only outside GitHub Actions could remain undetected. Product integration is still gated on the same GitHub Actions environment used by the repository.

## Final verification

Reconciliation verification completed on canonical code HEAD `d18f65033b7ad6cc1c71fc1421f174cc8827a8b0`.

- Timer/UI lifecycle suite: PASS.
- Public-information/bot-memory suite: PASS.
- Save integrity/migration suite: PASS.
- Current Podkidnoy/Perevodnoy rules/menu suite: PASS.
- Multiplayer save/resume simulation: PASS for all six supported variant × participant-count combinations.
- Full test suite: PASS — 232 tests in 29 test files.
- TypeScript typecheck: PASS.
- Production build: PASS.
- GitHub Actions `Milestone C CI`: PASS on the exact recorded code HEAD.

Conclusion: no required v1 production behavior remains unique to Milestone B. PR #4 is superseded and must not be merged.
