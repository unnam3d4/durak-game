# Milestone C Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a trustworthy green baseline for the current Milestone C/Perevodnoy work without discarding the 28 commits after the last known green build.

**Architecture:** Stabilization happens on `stabilize/milestone-c`, forked exactly from `916602f64a5801a652c97f296eef426eab07deca`. No new product features are allowed in this plan. Each root cause is isolated, reproduced, fixed minimally, and verified before the next task. GitHub Pages stays pointed at the product branch; the stabilization branch gets CI verification only.

**Tech Stack:** TypeScript 5.9, React 19, Vite 7, Vitest 3, Testing Library, GitHub Actions / Node 22.

**Spec:** `docs/superpowers/specs/2026-09-23-durak-game-design.md`

## Global Constraints

- Support Podkidnoy and Perevodnoy Durak for 2, 3, or 4 participants.
- Use exactly 36 unique cards and preserve the authoritative rules engine boundary.
- Human turns have a hard 20-second limit; reaching 0 seconds without a legal action ends the match as a technical loss.
- Bot visible move delay must never exceed 15 seconds.
- Persist unfinished matches with a versioned save schema and offer valid unfinished matches for continuation.
- Core rules must not import React, Yandex SDK, ads, or storage code.
- No new profile, economy, cosmetics, assets, Yandex SDK, or monetization work is permitted until this stabilization plan is green.
- Do not merge `feature/milestone-b-multiplayer-core` or PR #4 during this plan.
- Do not deploy `stabilize/milestone-c` to GitHub Pages.

## Review Focus

1. A schema-v2 multiplayer save created before the `variant` field existed must deserialize as `podkidnoy` without weakening validation of malformed saves.
2. A human timeout before anyone has legitimately finished must not fabricate 1st/2nd/3rd-place finishers.
3. A human timeout after legitimate finishers already exist must preserve only those real finishers and must not invent new placements.
4. Merely opening the main menu with a valid unfinished match must not delete or rewrite that save; choosing Continue must restore the exact saved bout.
5. The final branch must pass the same gates as release CI: `npm test`, `npm run typecheck`, and `npm run build`, including the multiplayer simulation suites.

---

### Task 1: Give the stabilization branch its own CI gate

**Files:**
- Modify: `.github/workflows/milestone-c-ci.yml`

**Interfaces:**
- Consumes: GitHub branch `stabilize/milestone-c`.
- Produces: push CI for the stabilization branch using the existing `verify` job.
- Must not modify: `.github/workflows/pages.yml`.

- [ ] **Step 1: Confirm current trigger does not cover stabilization**

Read `.github/workflows/milestone-c-ci.yml` and confirm the push branch list contains only:

```yaml
push:
  branches:
    - feature/milestone-c-perevodnoy
```

Expected: `stabilize/milestone-c` is absent.

- [ ] **Step 2: Add only the stabilization push trigger**

Change the push trigger to:

```yaml
push:
  branches:
    - feature/milestone-c-perevodnoy
    - stabilize/milestone-c
```

Leave the pull-request target unchanged:

```yaml
pull_request:
  branches:
    - feature/milestone-c-perevodnoy
```

- [ ] **Step 3: Verify Pages was not broadened**

Read `.github/workflows/pages.yml`.

Expected: it still deploys only `feature/milestone-c-perevodnoy`, never `stabilize/milestone-c`.

- [ ] **Step 4: Commit**

Commit message:

```text
ci: verify milestone c stabilization branch
```

Expected: the push itself starts `Milestone C CI` for `stabilize/milestone-c`.

---

### Task 2: Restore the TypeScript/build baseline without changing save behavior

**Files:**
- Modify: `src/save/multiplayer-match-save.ts:320-360`
- Test: `tests/save/multiplayer-match-save.test.ts`

**Interfaces:**
- Consumes: serialized JSON with `schemaVersion: 2`.
- Produces: `deserializeMultiplayerMatch(serialized: string): MultiplayerMatchSaveV2`.
- Preserves: legacy schema-v2 state without `variant` migrates to `variant: "podkidnoy"`.

- [ ] **Step 1: Reproduce the compiler failure**

Run:

```bash
npm run typecheck
```

Expected: FAIL with:

```text
src/save/multiplayer-match-save.ts(355,17): error TS18046: 'parsed' is of type 'unknown'.
```

This compiler failure is the RED condition for this non-behavioral narrowing repair.

- [ ] **Step 2: Prove the existing migration behavior is already correct at runtime**

Run:

```bash
npx vitest run tests/save/multiplayer-match-save.test.ts
```

Expected: PASS, including `migrates pre-variant multiplayer v2 saves to Podkidnoy`.

If this test fails, stop and use `superpowers:systematic-debugging`; do not change production code yet.

- [ ] **Step 3: Apply the minimal narrowing-safe implementation**

Refactor the post-JSON parsing flow so TypeScript narrowing is not invalidated by assigning a new object back into an `unknown` variable. Use an explicitly narrowed record and a separate state value. The implementation shape should be:

```ts
if (!isRecord(parsed) || parsed.schemaVersion !== 2) {
  throw new Error("Unsupported multiplayer save");
}

const record = parsed;

if (
  typeof record.savedAtMs !== "number" ||
  !Number.isFinite(record.savedAtMs)
) {
  throw new Error("Invalid multiplayer save: savedAtMs");
}

const state =
  isRecord(record.state) && !("variant" in record.state)
    ? {
        ...record.state,
        variant: "podkidnoy"
      }
    : record.state;

validateState(state);

return {
  schemaVersion: 2,
  savedAtMs: record.savedAtMs,
  state
};
```

Do not weaken `validateState`, do not add casts around `parsed.state`, and do not change the schema version.

- [ ] **Step 4: Verify save tests**

Run:

```bash
npx vitest run tests/save/multiplayer-match-save.test.ts
```

Expected: PASS.

- [ ] **Step 5: Verify typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS with exit code 0.

- [ ] **Step 6: Verify full build**

Run:

```bash
npm run build
```

Expected: PASS with exit code 0 and Vite output under `dist/`.

- [ ] **Step 7: Commit**

Commit message:

```text
fix: preserve narrowing during multiplayer save migration
```

---

### Task 3: Correct technical-loss result semantics

**Files:**
- Modify: `src/rules/multiplayer-technical-loss.ts`
- Modify: `tests/rules/multiplayer-technical-loss.test.ts`
- Verify: `tests/ui/MultiplayerTableScreen.test.tsx`

**Interfaces:**
- Consumes: `applyTechnicalLoss(state: MultiplayerGameState, playerId: ParticipantId)`.
- Produces: terminal state with `phase: "finished"` and `foolId === playerId`.
- Preserves: only legitimately recorded `finishOrder`; timeout must never create placements for players who still hold cards.

- [ ] **Step 1: Replace the incorrect placement expectation with the required behavior**

Change the first rule test to:

```ts
it("does not fabricate placements when the timed-out player loses", () => {
  const state = makeMultiplayerState({}, 4);
  const next = applyTechnicalLoss(state, "human");

  expect(next.phase).toBe("finished");
  expect(next.foolId).toBe("human");
  expect(next.finishOrder).toEqual([]);
  expect(next.boutFinishOrder).toEqual([]);
  expect(next.turnNumber).toBe(state.turnNumber + 1);
});
```

Change the existing-finisher case to:

```ts
it("preserves only finishers recorded before the technical loss", () => {
  const state = makeMultiplayerState(
    { finishOrder: ["bot2"], boutFinishOrder: ["bot3"] },
    4
  );
  const next = applyTechnicalLoss(state, "human");

  expect(next.finishOrder).toEqual(["bot2"]);
  expect(next.boutFinishOrder).toEqual([]);
  expect(next.foolId).toBe("human");
});
```

- [ ] **Step 2: Run the focused rule tests and watch RED**

Run:

```bash
npx vitest run tests/rules/multiplayer-technical-loss.test.ts
```

Expected: FAIL because current implementation appends every non-losing participant to `finishOrder`.

- [ ] **Step 3: Implement the minimal semantic fix**

Remove the loop that appends other participants. The relevant returned fields should be:

```ts
return {
  ...state,
  phase: "finished",
  finishOrder: [...state.finishOrder],
  boutFinishOrder: [],
  foolId: playerId,
  activePlayerId: playerId,
  turnNumber: state.turnNumber + 1
};
```

Keep the invalid-participant guard and finished-state idempotence.

- [ ] **Step 4: Run focused rule tests**

Run:

```bash
npx vitest run tests/rules/multiplayer-technical-loss.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run timeout/UI regressions**

Run:

```bash
npx vitest run tests/timer/multiplayer-timeout.test.ts tests/ui/MultiplayerTableScreen.test.tsx
```

Expected: PASS; the human timeout still ends the match and does not auto-play or auto-take.

- [ ] **Step 6: Run full suite**

Run:

```bash
npm test
```

Expected: PASS, 0 failed tests.

- [ ] **Step 7: Commit**

Commit message:

```text
fix: avoid fabricated placements on technical loss
```

---

### Task 4: Pin save/menu non-destructive behavior

**Files:**
- Modify: `tests/app/App.test.tsx`
- Production files: none unless the new test reveals a real defect.

**Interfaces:**
- Consumes: `CURRENT_MULTIPLAYER_MATCH_KEY`, `saveCurrentMultiplayerMatch`, and default `<App />` menu render.
- Produces: regression coverage that viewing the menu does not mutate a valid unfinished save.

- [ ] **Step 1: Add the regression test**

Add:

```ts
it("does not rewrite or delete an unfinished match while showing the menu", () => {
  const saved = createMultiplayerMatch(24680, 4, "perevodnoy");
  saveCurrentMultiplayerMatch(window.localStorage, saved, 1234);
  const before = window.localStorage.getItem(
    "durak.currentMatch.multiplayer.v2"
  );

  render(<App />);

  expect(screen.getByRole("button", { name: /Продолжить/ }))
    .toBeInTheDocument();
  expect(
    window.localStorage.getItem("durak.currentMatch.multiplayer.v2")
  ).toBe(before);
});
```

- [ ] **Step 2: Run the focused App tests**

Run:

```bash
npx vitest run tests/app/App.test.tsx
```

Expected: PASS. If it fails because menu rendering mutates the save, stop and use `superpowers:systematic-debugging` before changing `App.tsx`.

- [ ] **Step 3: Verify Continue still restores the exact saved bout**

Run the same file and confirm the existing test `offers to continue a saved multiplayer match` passes.

Expected: PASS.

- [ ] **Step 4: Commit test-only protection**

Commit message:

```text
test: protect unfinished match on menu render
```

No production-code change is allowed in this task unless Step 2 exposes a real defect and a separate RED→GREEN fix is performed.

---

### Task 5: Establish the stabilization verification matrix

**Files:**
- Production files: none unless a reproducible failure is found.
- Test files: only the smallest owning test file for any reproduced defect.

**Interfaces:**
- Consumes: the complete current game implementation.
- Produces: fresh evidence for rules, simulations, type safety, and production build.

- [ ] **Step 1: Run core multiplayer rules**

Run:

```bash
npx vitest run   tests/rules/create-multiplayer-match.test.ts   tests/rules/multiplayer-legal-actions.test.ts   tests/rules/multiplayer-reducer.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run persistence and public-information boundary**

Run:

```bash
npx vitest run   tests/save/multiplayer-match-save.test.ts   tests/core/multiplayer-public-view.test.ts   tests/controllers/multiplayer-bot-memory.test.ts   tests/controllers/multiplayer-bot-controller.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run UI flow**

Run:

```bash
npx vitest run tests/app/App.test.tsx tests/ui/MultiplayerTableScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run multiplayer simulations**

Run:

```bash
npx vitest run   tests/simulation/podkidnoy-multiplayer.sim.test.ts   tests/simulation/podkidnoy-multiplayer-save-resume.sim.test.ts
```

Expected: PASS with no deadlock, invalid-state, conservation, or save/resume failures.

- [ ] **Step 5: Run the complete verification gate**

Run, in this exact order:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all three commands exit 0.

- [ ] **Step 6: Inspect GitHub Actions for the branch HEAD**

Expected: `Milestone C CI` conclusion is `success` for the exact stabilization HEAD SHA.

If GitHub Actions disagrees with local verification, treat the CI environment difference as a new bug and use `superpowers:systematic-debugging`; do not merge.

---

### Task 6: Package the stabilized branch for review, without merging B/C

**Files:**
- No product changes.

**Interfaces:**
- Consumes: green `stabilize/milestone-c` HEAD.
- Produces: a reviewable stabilization PR into `feature/milestone-c-perevodnoy`.
- Explicitly excludes: PR #4 / `feature/milestone-b-multiplayer-core`.

- [ ] **Step 1: Compare stabilization against its exact base**

Compare:

```text
916602f64a5801a652c97f296eef426eab07deca...stabilize/milestone-c
```

Expected: only stabilization/verification changes from Tasks 1–4.

- [ ] **Step 2: Re-run final gate immediately before PR**

Run:

```bash
npm test && npm run typecheck && npm run build
```

Expected: exit 0.

- [ ] **Step 3: Request code review**

Use `superpowers:requesting-code-review` over the stabilization diff, with special attention to:
- save-schema migration validation;
- terminal-state semantics;
- false placement/statistics data;
- accidental loss of unfinished matches;
- CI/Pages branch separation.

- [ ] **Step 4: Fix Critical/Important findings using RED→GREEN**

Each accepted finding gets its own reproducing test before production code is changed.

- [ ] **Step 5: Create a stabilization PR**

Base: `feature/milestone-c-perevodnoy`  
Head: `stabilize/milestone-c`

The PR description must include fresh verification counts and explicitly state that PR #4 remains separate and unmerged.

- [ ] **Step 6: Stop before branch reconciliation**

Do not merge or cherry-pick `feature/milestone-b-multiplayer-core` in this plan. B/C reconciliation starts only after the stabilization PR is green and reviewed, under a separate plan.
