# Branch Reconciliation — Milestone B into Stabilized C

Date: 2026-09-23  
Status: Approved design for implementation planning  
Repository: `unnam3d4/durak-game`

## 1. Goal

Reconcile the diverged `feature/milestone-b-multiplayer-core` branch with the current stabilized game line without reintroducing obsolete behavior, duplicate implementation, or branch-history conflicts.

The product goal is not to preserve Milestone B commit history. The product goal is to preserve every behavior from B that is still required by the Durak v1 specification, while keeping the newer and already verified implementation in the stabilized C line.

## 2. Canonical development line

The canonical source for reconciliation is:

`stabilize/milestone-c`

This branch has a verified baseline:

- all current automated tests pass;
- TypeScript typecheck passes;
- production Vite build passes;
- the stabilization CI is green;
- human timeout behavior matches the product specification;
- Podkidnoy/Perevodnoy variant support is present;
- current menu and save/resume behavior is covered by regression tests.

The following branch is treated as historical input only:

`feature/milestone-b-multiplayer-core`

It must not be merged wholesale into the canonical line.

## 3. Why direct merge is rejected

A direct merge of B into the stabilized line is rejected because:

- the branches diverged from merge base `77d57842989e62c054008869eb0775eb9a12f437`;
- B contains 27 commits not present by ancestry in the stabilized line;
- the stabilized line contains a much larger set of newer commits;
- PR #4 is conflict-bearing;
- several B behaviors are already present in C through independently evolved code;
- some B-era behavior is obsolete, specifically human timeout fallback actions, while the current product specification requires technical loss for the human player at zero seconds;
- merging by ancestry would optimize for Git history rather than product correctness.

## 4. Reconciliation principle

Reconciliation is behavior-based, not commit-based.

For every feature present in B:

1. Identify the intended user/domain behavior.
2. Determine whether the same behavior already exists in the stabilized line.
3. Determine whether current tests prove that behavior.
4. Classify the B feature as:
   - **Already covered** — equivalent or stronger behavior exists and tests prove it.
   - **Superseded** — B behavior conflicts with the current specification or newer architecture.
   - **Missing** — required behavior is absent or insufficiently covered.
5. Do nothing for **Already covered**.
6. Do not port **Superseded** behavior.
7. For **Missing**, create a new failing test against the current architecture, then implement the smallest compliant fix.

No B commit is cherry-picked merely because it exists.

## 5. Audit groups

The 27 B-only commits are audited by functional group rather than individually merging them.

### 5.1 Turn timer and turn lifecycle

Audit:

- 20-second multiplayer timer;
- deadline starts after animation;
- focus/visibility pause handling;
- bot timeout fallback safety;
- duplicate timeout prevention by turn number;
- human timeout semantics.

Expected canonical behavior:

- human reaches zero without a legal action → technical loss;
- human timeout never auto-plays and never auto-takes;
- bots use normal decision flow and remain bounded by the 15-second visible-action requirement;
- fallback logic may exist only as a safety mechanism for non-human seats;
- one timeout can affect a turn at most once;
- focus/visibility transitions must not accidentally consume a paused turn.

B's automatic human fallback is explicitly classified as superseded.

### 5.2 Public take events and bot memory

Audit:

- `lastTakeEvent` storage;
- resolved taken cards remain public information;
- public view exposes only legitimate public information;
- bot memory learns cards that were visibly taken;
- suit-weakness inference is deduplicated without losing later independent signals;
- save/restore retains the event consistently.

Expected canonical behavior:

- no bot receives hidden opponent hands;
- a bot may learn only information a human in the same seat could have observed;
- public take history remains usable after the table itself has been cleared.

### 5.3 Save integrity and migration

Audit:

- exact 36-card conservation;
- canonical card identity `id === `${suit}-${rank}``;
- duplicate card rejection;
- take-event reference validation;
- save/resume equivalence;
- legacy multiplayer schema-v2 saves that predate `variant`;
- preservation of current Podkidnoy/Perevodnoy variant.

Expected canonical behavior:

- malformed saves are rejected;
- valid old schema-v2 multiplayer saves missing only `variant` migrate to Podkidnoy;
- current saves round-trip without weakening validation;
- menu inspection never rewrites or deletes a valid unfinished match.

### 5.4 Multiplayer UI and environment edge cases

Audit:

- timer rendering and urgency state;
- animation/timer sequencing;
- document visibility changes;
- window focus/blur;
- result handling after timeout;
- prevention of stale timeout actions;
- current Perevodnoy transfer controls must remain intact.

Expected canonical behavior:

- no B-era UI restoration may remove or regress Perevodnoy interactions;
- no environment event may cause a hidden automatic human action;
- result UI must stay consistent with domain result semantics.

### 5.5 Simulation and invariant coverage

Audit:

- multiplayer save/resume stress;
- complete matches for 2/3/4-player supported modes;
- Podkidnoy and Perevodnoy;
- card conservation;
- terminal-state reachability;
- no illegal action acceptance;
- no hidden-information leak.

Tests from B may be recreated or strengthened in the current branch if they prove a still-relevant invariant that current coverage does not already prove.

## 6. Known preliminary findings

The initial read-only comparison has already established:

- `src/controllers/multiplayer-bot-memory.ts` is identical between B and stabilized C;
- `src/rules/multiplayer-resolution.ts` is identical;
- `src/save/match-save.ts` is identical;
- `src/timer/multiplayer-timeout.ts` is identical;
- `src/ui/multiplayer-table.css` is identical;
- current C contains B's `lastTakeEvent` functionality;
- current C contains canonical card-identity validation;
- current C contains the multiplayer timeout infrastructure;
- current C contains additional variant support, Perevodnoy rules, transfer UI, technical-loss behavior, menu flow, and newer regression tests not present in B;
- B's tests expecting automatic human fallback at timeout are obsolete against the current product specification.

These findings make wholesale merge or blind cherry-pick unjustified.

## 7. Git and PR policy

PR #4:

`feature/milestone-b-multiplayer-core -> feature/milestone-c-perevodnoy`

must remain unmerged during reconciliation.

After all B functional groups are classified and any true gaps are implemented and verified:

- PR #4 may be closed as superseded;
- the B branch may remain in Git history as an archival reference;
- branch deletion is not required for product correctness and must not be performed as part of reconciliation unless explicitly requested later.

No force-push is required.

## 8. Verification gate

Reconciliation is complete only when:

- every B-only functional group has an explicit classification;
- every **Missing** behavior has a reproducing RED test followed by a GREEN fix;
- no **Superseded** B behavior is reintroduced;
- Podkidnoy and Perevodnoy continue to work for all supported participant counts;
- multiplayer save/restore tests pass;
- timer and UI tests pass;
- simulation suites pass;
- `npm test` passes;
- `npm run typecheck` passes;
- `npm run build` passes;
- exact-head GitHub CI is green;
- the stabilization baseline remains at least as strong as before reconciliation.

## 9. Non-goals

This reconciliation does not implement:

- first-run nickname;
- profile level/rank;
- achievements;
- coins or cosmetics;
- Yandex SDK;
- ads;
- localization;
- new visual assets;
- real online multiplayer.

Those remain later product milestones and must not be mixed into branch reconciliation.

## 10. Exit state

The desired exit state is one coherent canonical line where:

- no required v1 behavior exists only on B;
- no obsolete B behavior has been restored;
- the current stabilized C architecture remains authoritative;
- PR #4 is no longer needed for product development;
- future Milestone C progression/identity work can proceed on a clean, verified base.
