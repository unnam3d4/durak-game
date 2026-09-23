# Milestone B Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that every still-required Milestone B behavior is already preserved or superseded in the stabilized C line, strengthen the one uncovered participant-count verification, and retire PR #4 without merging obsolete code.

**Architecture:** Reconciliation is behavior-based. `stabilize/milestone-c` remains canonical; B is read-only evidence. No production implementation is copied from B unless a required behavior is first proven missing by a failing test. Current audit evidence indicates no product-code port is required; the only planned codebase change is test-only strengthening of the save/resume simulation matrix for 2-player Podkidnoy and Perevodnoy.

**Tech Stack:** TypeScript 5.9, React 19, Vite 7, Vitest 3, Testing Library, GitHub Actions / Node 22.

**Spec:** `docs/superpowers/specs/2026-09-23-branch-reconciliation-design.md`

## Global Constraints

- `stabilize/milestone-c` is the canonical reconciliation line.
- `feature/milestone-b-multiplayer-core` is historical input only and must not be merged wholesale.
- No B commit is cherry-picked merely because it exists.
- Human timeout at zero seconds is a technical loss; B's automatic human fallback is superseded.
- Bots may use only public information plus their own hand.
- Valid current and migrated saves must preserve exact 36-card integrity and canonical card identities.
- Podkidnoy and Perevodnoy must remain supported for 2, 3, and 4 participants.
- PR #4 remains unmerged until every B-only functional group is classified and the exact-head verification gate is green.
- No nickname/profile/economy/cosmetics/Yandex SDK/ads/localization/assets/real-online work is included.
- No force-push and no deletion of the B branch.

## Review Focus

1. **2-player save/resume in both variants:** a complete 2-player Podkidnoy or Perevodnoy match repeatedly serialized/deserialized must still terminate without deadlock or card loss.
2. **Human timeout after blur/visibility transitions:** environment pausing must never revive the obsolete B behavior that auto-plays or auto-takes for the human.
3. **Repeated public take observations:** bot memory must not double-count the same take event or leak hidden cards while still learning later independent public signals.
4. **Legacy schema-v2 saves:** a save missing only `variant` must migrate to Podkidnoy while malformed card identities and invalid take-event references remain rejected.
5. **Perevodnoy after reconciliation:** transfer actions and variant persistence must remain present even though B itself predates that functionality.

---

### Task 1: Record the functional reconciliation matrix

**Files:**
- Create: `docs/superpowers/audits/2026-09-23-milestone-b-reconciliation.md`
- Read only: `feature/milestone-b-multiplayer-core`
- Read only: `stabilize/milestone-c`

**Interfaces:**
- Consumes: the approved reconciliation spec and the B/C file comparisons.
- Produces: one auditable classification document used by Tasks 3 and 4 to justify retiring PR #4.

- [ ] **Step 1: Create the audit document with the exact classification table**

Create:

```markdown
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
```

- [ ] **Step 2: Cross-check the five byte-identical production files**

Fetch each file from both refs and compare complete contents:

```text
src/controllers/multiplayer-bot-memory.ts
src/rules/multiplayer-resolution.ts
src/save/match-save.ts
src/timer/multiplayer-timeout.ts
src/ui/multiplayer-table.css
```

Expected: complete content equality for all five.

If any file is no longer equal because the canonical branch advanced, update the audit wording to describe the concrete semantic difference; do not copy B code.

- [ ] **Step 3: Cross-check the superseded timeout behavior**

Verify the current UI tests contain:

```ts
it("ends the match with a technical loss when a human opening turn reaches zero", ...)
it("does not auto-take when the human defender reaches zero", ...)
```

and the B test history contains the obsolete expectations for safe human fallback/auto-take.

Expected: classification remains `Superseded`.

- [ ] **Step 4: Commit the audit**

```bash
git add docs/superpowers/audits/2026-09-23-milestone-b-reconciliation.md
git commit -m "docs: record milestone b reconciliation audit"
```

No product code changes are permitted in this task.

---

### Task 2: Strengthen save/resume coverage for the missing participant count

**Files:**
- Modify: `tests/simulation/podkidnoy-multiplayer-save-resume.sim.test.ts:38-43`
- Production files: none

**Interfaces:**
- Consumes: `createMultiplayerMatch(seed, participantCount, variant)`, `serializeMultiplayerMatch`, and `deserializeMultiplayerMatch`.
- Produces: explicit save/resume simulation coverage for every supported combination of variant × participant count.

This is a characterization/coverage task for already-implemented behavior. It changes no production behavior, so no production RED→GREEN cycle applies.

- [ ] **Step 1: Expand the existing matrix to all six supported combinations**

Replace:

```ts
it.each([
  ["podkidnoy", 3],
  ["podkidnoy", 4],
  ["perevodnoy", 3],
  ["perevodnoy", 4]
] as const)(
```

with:

```ts
it.each([
  ["podkidnoy", 2],
  ["podkidnoy", 3],
  ["podkidnoy", 4],
  ["perevodnoy", 2],
  ["perevodnoy", 3],
  ["perevodnoy", 4]
] as const)(
```

Do not change the simulation algorithm, seed count, serialization cadence, or assertions.

- [ ] **Step 2: Run the focused save/resume simulation**

Run:

```bash
npx vitest run tests/simulation/podkidnoy-multiplayer-save-resume.sim.test.ts
```

Expected: PASS for all six table rows.

If either 2-player row fails, stop. Load `superpowers:systematic-debugging`, identify the root cause, then upgrade that concrete defect into a RED→GREEN production fix before continuing.

- [ ] **Step 3: Run the complete multiplayer simulation suite**

Run:

```bash
npx vitest run   tests/simulation/podkidnoy-multiplayer.sim.test.ts   tests/simulation/podkidnoy-multiplayer-save-resume.sim.test.ts
```

Expected: PASS; both Podkidnoy and Perevodnoy cover 2/3/4-player completion, and save/resume covers all six supported combinations.

- [ ] **Step 4: Commit the test-only strengthening**

```bash
git add tests/simulation/podkidnoy-multiplayer-save-resume.sim.test.ts
git commit -m "test: cover two-player multiplayer save resume"
```

---

### Task 3: Run the reconciliation verification gate and finalize audit evidence

**Files:**
- Modify: `docs/superpowers/audits/2026-09-23-milestone-b-reconciliation.md`
- Production files: none unless an actual required-behavior defect is reproduced by a failing test.

**Interfaces:**
- Consumes: classifications from Task 1 and six-way save/resume coverage from Task 2.
- Produces: exact-head evidence that B contains no required behavior missing from the canonical line.

- [ ] **Step 1: Verify timer and UI lifecycle behavior**

Run:

```bash
npx vitest run   tests/timer/multiplayer-timeout.test.ts   tests/ui/MultiplayerTableScreen.test.tsx   tests/rules/multiplayer-technical-loss.test.ts
```

Expected: PASS, including:

- hidden-page bot move pause;
- hidden-page turn-timer pause;
- no clock restart while blurred;
- human opening timeout → technical loss;
- human defender timeout → no auto-take;
- technical loss does not fabricate placements.

- [ ] **Step 2: Verify public-information and bot-memory behavior**

Run:

```bash
npx vitest run   tests/core/multiplayer-public-view.test.ts   tests/controllers/multiplayer-bot-memory.test.ts   tests/controllers/multiplayer-bot-controller.test.ts
```

Expected: PASS; no opponent hidden-card identity leak and resolved public take information remains learnable.

- [ ] **Step 3: Verify save integrity and migration**

Run:

```bash
npx vitest run   tests/save/match-save.test.ts   tests/save/multiplayer-match-save.test.ts
```

Expected: PASS, including:

- canonical physical card IDs;
- duplicate-card rejection;
- `lastTakeEvent` persistence/reference validation;
- Perevodnoy round-trip;
- unknown variant rejection;
- pre-variant schema-v2 migration to Podkidnoy.

- [ ] **Step 4: Verify current rules that B must not regress**

Run:

```bash
npx vitest run   tests/rules/create-multiplayer-match.test.ts   tests/rules/multiplayer-legal-actions.test.ts   tests/rules/multiplayer-reducer.test.ts   tests/app/App.test.tsx
```

Expected: PASS; current Podkidnoy/Perevodnoy setup, transfer rules, and menu flow remain intact.

- [ ] **Step 5: Run the complete gate**

Run in this exact order:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 6: Verify exact-head GitHub Actions**

Find the `Milestone C CI` run whose `head_sha` is exactly the current reconciliation HEAD.

Expected:

```text
status: completed
conclusion: success
```

Do not use an earlier green run as evidence.

- [ ] **Step 7: Append exact verification evidence to the audit**

First run:

```bash
git rev-parse HEAD
```

Copy that exact SHA into the audit. Append a `## Final verification` section that records, in plain text, the exact SHA returned above and these verified statements:

```markdown
- Timer/UI lifecycle suite: PASS.
- Public-information/bot-memory suite: PASS.
- Save integrity/migration suite: PASS.
- Current Podkidnoy/Perevodnoy rules/menu suite: PASS.
- Full test suite: PASS.
- TypeScript typecheck: PASS.
- Production build: PASS.
- GitHub Actions `Milestone C CI`: PASS on the exact recorded HEAD.

Conclusion: no required v1 production behavior remains unique to Milestone B. PR #4 is superseded and must not be merged.
```

Do not write an estimated SHA or test count. Use only the values actually observed in Steps 5 and 6.

- [ ] **Step 8: Commit final evidence**

```bash
git add docs/superpowers/audits/2026-09-23-milestone-b-reconciliation.md
git commit -m "docs: finalize milestone b reconciliation evidence"
```

Because Step 8 changes HEAD, wait for CI on this exact documentation commit and require another `success` before Task 4. The code is unchanged, but the PR-closing evidence must name a green final HEAD.

---

### Task 4: Retire the obsolete integration path

**Files:**
- Repository files: none.
- GitHub PR metadata: PR #4 and PR #5.

**Interfaces:**
- Consumes: the final reconciliation audit and a green exact-head CI run from Task 3.
- Produces: one canonical open PR path and no remaining invitation to merge obsolete B behavior.

- [ ] **Step 1: Update PR #5 to describe both stabilization and reconciliation**

Set PR #5 title to:

```text
Stabilize and reconcile Milestone C
```

Ensure its body includes:

```markdown
## Stabilization

- Fixed TypeScript narrowing in multiplayer save migration.
- Corrected technical-loss placement semantics.
- Added unfinished-match menu protection.
- Preserved a green tests/typecheck/build baseline.

## Milestone B reconciliation

- Audited all 27 B-only commits by behavior, not ancestry.
- Confirmed timer fallback, public take events, bot memory, canonical card validation, and save integrity are already preserved.
- Classified B's automatic human timeout action as superseded by the required technical-loss rule.
- Strengthened save/resume simulation coverage to 2/3/4 players for both Podkidnoy and Perevodnoy.
- No B production commit required cherry-picking.

PR #4 is superseded and must not be merged.

Verification details are recorded in:
`docs/superpowers/audits/2026-09-23-milestone-b-reconciliation.md`
```

Keep PR #5 as draft unless the final review step explicitly determines it is ready for integration.

- [ ] **Step 2: Add the superseded explanation to PR #4**

Use exactly this substantive message:

```text
Superseded by the stabilized C line after behavior-based reconciliation.

The 27 B-only commits were audited by functional behavior. Required timer fallback infrastructure, public take events, bot memory, canonical card validation, save validation, and save/resume behavior are already present in the canonical line. The B-era automatic human timeout fallback conflicts with the current v1 requirement that a human timeout ends as a technical loss. Newer C also contains Perevodnoy variant/transfer behavior that B predates.

No required v1 production behavior remains unique to this PR, so merging it would add conflict risk without product value. The reconciliation evidence is in docs/superpowers/audits/2026-09-23-milestone-b-reconciliation.md.
```

- [ ] **Step 3: Close PR #4 without merging**

Expected final PR #4 state:

```text
state: closed
merged: false
```

Do not delete `feature/milestone-b-multiplayer-core`.

- [ ] **Step 4: Verify PR #5 still targets the product branch and is mergeable**

Expected:

```text
base: feature/milestone-c-perevodnoy
head: stabilize/milestone-c
state: open
draft: true
mergeable: true
```

If mergeability is temporarily `unknown`, re-fetch after GitHub recomputes it. If it becomes `false`, do not merge; diagnose the conflict before proceeding.

- [ ] **Step 5: Stop before merging PR #5**

Reconciliation is complete when PR #4 is closed unmerged and PR #5 is green/open. Merging PR #5 into the shared product branch is a separate integration decision and is not authorized by this plan.
