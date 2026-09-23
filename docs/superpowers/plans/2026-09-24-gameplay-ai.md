# Gameplay and Human-like AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make match rules, end-of-game sequencing, opponent identity, AI decisions, AI timing, and rare AI surrender feel coherent and human-like without exposing hidden information.

**Architecture:** Preserve MultiplayerGameState and MultiplayerPublicView as the authoritative rule/public boundaries. Split personality and decision scoring out of the existing MultiplayerBotController, keep randomness injectable for deterministic tests, and add presentation events outside the reducer so rule resolution stays immediate while the UI can finish the final animation before revealing results.

**Tech Stack:** TypeScript, Vitest, React Testing Library.

**Spec:** docs/superpowers/specs/2026-09-24-ranked-pve-release-design.md

## Global Constraints

- AI never receives hidden opponent hands or future talon order.
- AI action delay is decision time only and never exceeds 15,000 ms.
- No artificial connection-loss behavior.
- Different AI seats have stable per-match personalities.
- Rare AI surrender is possible only in a clearly bad late position and is never a scripted player reward.
- First attacker follows lowest dealt trump; no-trump fallback is deterministic from the secure match seed.
- Final result overlay is presentation-delayed until final table movement is shown.

## Review Focus

- A legal position with only one action must never be changed by personality noise.
- A no-trump opening must still select an active participant and remain deterministic for the same seed.
- A finished state reached after Take must preserve the cards collected by the defender before result reveal.
- Three AI seats created from one match seed must not accidentally receive identical personality seeds.
- AI surrender must never fire before a configured minimum turn and never when its position is competitive.

---

### Task 1: Make the opening fallback an explicit rule

**Files:**
- Modify: src/rules/create-multiplayer-match.ts
- Modify: tests/rules/create-multiplayer-match.test.ts

**Interfaces:**
- Consumes: createMultiplayerMatch(seed, participantCount, variant)
- Produces: chooseInitialAttacker(seed, participants, hands, trumpSuit): ParticipantId

- [ ] **Step 1: Write the failing no-trump fallback test**

~~~ts
it("uses the seeded fallback only when no dealt hand contains a trump", () => {
  const participants = ["human", "bot", "bot2"] as const;
  const fallbackA = fallbackAttackerForSeed(101, participants);
  const fallbackB = fallbackAttackerForSeed(101, participants);

  expect(fallbackA).toBe(fallbackB);
  expect(participants).toContain(fallbackA);
});
~~~

Also rename the existing test description from an implementation phrase to the product rule phrase: "uses a deterministic seeded starter when no dealt player holds a trump".

- [ ] **Step 2: Run the focused test**

Run: npm test -- tests/rules/create-multiplayer-match.test.ts  
Expected: PASS for existing behavior; the red phase is the rename/refactor target, not a behavior regression.

- [ ] **Step 3: Extract the explicit initial-attacker function**

~~~ts
export function chooseInitialAttacker(
  seed: number,
  participants: readonly ParticipantId[],
  hands: ParticipantHands,
  trumpSuit: Card["suit"]
): ParticipantId {
  const candidates = participants
    .flatMap((participantId) =>
      hands[participantId].map((card) => ({ participantId, card }))
    )
    .filter(({ card }) => card.suit === trumpSuit)
    .sort((a, b) => a.card.rank - b.card.rank);

  return candidates[0]?.participantId ??
    fallbackAttackerForSeed(seed, participants);
}
~~~

Use it from createMultiplayerMatch. Do not alter deck order, dealing order, or trump selection.

- [ ] **Step 4: Run the focused test**

Run: npm test -- tests/rules/create-multiplayer-match.test.ts  
Expected: all tests PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/rules/create-multiplayer-match.ts tests/rules/create-multiplayer-match.test.ts
git commit -m "refactor: make initial attacker rule explicit"
~~~

### Task 2: Introduce stable AI personalities

**Files:**
- Create: src/controllers/multiplayer-bot-personality.ts
- Create: tests/controllers/multiplayer-bot-personality.test.ts
- Modify: src/controllers/multiplayer-bot-controller.ts

**Interfaces:**
- Consumes: match seed, ParticipantId, BotSkill
- Produces: BotPersonality and createBotPersonality(seed, participantId, skill)

~~~ts
export type BotPersonality = Readonly<{
  skill: BotSkill;
  aggression: number;
  riskTolerance: number;
  trumpConservation: number;
  pressure: number;
  memoryUse: number;
  reactionSpeed: number;
  mistakeTendency: number;
  transferPreference: number;
  throwInPreference: number;
  tiltTendency: number;
  quitTendency: number;
}>;
~~~

- [ ] **Step 1: Write deterministic personality tests**

~~~ts
it("is stable for the same seed, seat, and skill", () => {
  expect(createBotPersonality(42, "bot2", "normal"))
    .toEqual(createBotPersonality(42, "bot2", "normal"));
});

it("gives different seats different profiles in the same match", () => {
  expect(createBotPersonality(42, "bot", "normal"))
    .not.toEqual(createBotPersonality(42, "bot2", "normal"));
});

it("keeps every factor in the safe 0..1 range", () => {
  const p = createBotPersonality(99, "bot3", "hard");
  for (const value of [
    p.aggression, p.riskTolerance, p.memoryUse, p.reactionSpeed,
    p.mistakeTendency, p.transferPreference, p.throwInPreference,
    p.tiltTendency, p.quitTendency
  ]) expect(value).toBeGreaterThanOrEqual(0);
});
~~~

- [ ] **Step 2: Run the focused test and verify RED**

Run: npm test -- tests/controllers/multiplayer-bot-personality.test.ts  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement seeded personality generation**

Use a small deterministic hash of seed plus participantId, then createSeededRandom from the resulting uint32. Keep skill baselines recognizable:
- easy: lower memory, higher mistake tendency;
- normal: balanced;
- hard: high memory, low mistake tendency;
- quitTendency capped at 0.02 in all profiles.

- [ ] **Step 4: Run the focused test**

Run: npm test -- tests/controllers/multiplayer-bot-personality.test.ts  
Expected: PASS.

- [ ] **Step 5: Change MultiplayerBotController to accept BotPersonality**

~~~ts
constructor(
  private readonly random: RandomSource = Math.random,
  personality: BotPersonality
) {
  this.personality = personality;
}
~~~

Replace the internal PROFILES lookup with personality fields. Keep a compatibility factory for tests:

~~~ts
export function createBotController(
  random: RandomSource,
  seed: number,
  participantId: ParticipantId,
  skill: BotSkill
): MultiplayerBotController {
  return new MultiplayerBotController(
    random,
    createBotPersonality(seed, participantId, skill)
  );
}
~~~

- [ ] **Step 6: Update existing controller tests**

Replace direct skill constructor calls with a deterministic personality helper. Preserve every existing legal-action assertion.

- [ ] **Step 7: Run controller tests**

Run: npm test -- tests/controllers/multiplayer-bot-controller.test.ts tests/controllers/multiplayer-bot-personality.test.ts  
Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add src/controllers/multiplayer-bot-personality.ts src/controllers/multiplayer-bot-controller.ts tests/controllers
git commit -m "feat: add stable bot personalities"
~~~

### Task 3: Replace random mistakes with bounded human-like action variation

**Files:**
- Create: src/controllers/multiplayer-bot-choice.ts
- Create: tests/controllers/multiplayer-bot-choice.test.ts
- Modify: src/controllers/multiplayer-bot-controller.ts
- Modify: tests/controllers/multiplayer-bot-controller.test.ts

**Interfaces:**
- Consumes: scored legal candidates, BotPersonality, RandomSource
- Produces: chooseScoredAction(candidates, personality, random)

~~~ts
export type ScoredAction = Readonly<{
  action: MultiplayerGameAction;
  cost: number;
}>;

export function chooseScoredAction(
  candidates: readonly ScoredAction[],
  personality: BotPersonality,
  random: RandomSource
): MultiplayerGameAction;
~~~

- [ ] **Step 1: Write RED tests for bounded choice**

~~~ts
it("always picks the only legal candidate", () => {
  const only = { action: ACTION_A, cost: 4 };
  expect(chooseScoredAction([only], PERSONALITY, () => 0.99))
    .toEqual(ACTION_A);
});

it("never chooses a catastrophically worse move just because random is high", () => {
  const chosen = chooseScoredAction(
    [
      { action: ACTION_A, cost: 1 },
      { action: ACTION_B, cost: 1.3 },
      { action: ACTION_C, cost: 9 }
    ],
    { ...PERSONALITY, mistakeTendency: 0.4 },
    () => 0.99
  );
  expect(chosen).not.toEqual(ACTION_C);
});
~~~

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/controllers/multiplayer-bot-choice.test.ts  
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement near-best sampling**

Sort by cost ascending. Define tolerance as:
- hard: approximately 0.20 plus personality adjustment;
- normal: approximately 0.60;
- easy: approximately 1.20.

Only candidates within bestCost + tolerance are eligible for stochastic variation. Weight lower-cost candidates more strongly. Never sample outside the near-best set.

- [ ] **Step 4: Integrate attack, defense, transfer, and throw-in candidate scoring**

Change the existing chooseAttack/chooseDefense/chooseThrowIn helpers to return scored candidate arrays rather than immediately selecting index 0. Preserve tactical special cases such as finishing the hand and known cover penalties by expressing them as cost adjustments.

- [ ] **Step 5: Add behavior regression tests**

Add explicit tests that:
- hard bot still preserves a comparable trump;
- hard Perevodnoy bot still prefers a useful transfer;
- easy bot may choose a second-best plausible move under a deterministic random source;
- no bot returns an illegal action.

- [ ] **Step 6: Run controller suite**

Run: npm test -- tests/controllers/multiplayer-bot-controller.test.ts tests/controllers/multiplayer-bot-choice.test.ts  
Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add src/controllers/multiplayer-bot-choice.ts src/controllers/multiplayer-bot-controller.ts tests/controllers
git commit -m "feat: make bot decisions variably human-like"
~~~

### Task 4: Make bot decision timing personality-aware

**Files:**
- Modify: src/controllers/bot-delay.ts
- Modify: tests/controllers/bot-delay.test.ts
- Modify: src/ui/MultiplayerTableScreen.tsx

**Interfaces:**
- Consumes: legalActionCount, complexity, reactionSpeed, random
- Produces: computeBotDelayMs(input, random) bounded to MAX_BOT_DELAY_MS

~~~ts
export type BotDelayInput = Readonly<{
  legalActionCount: number;
  complexity: number;
  reactionSpeed: number;
}>;
~~~

- [ ] **Step 1: Extend RED timing tests**

~~~ts
it("makes a fast personality faster for the same position", () => {
  const fast = computeBotDelayMs(
    { legalActionCount: 5, complexity: 0.6, reactionSpeed: 0.9 },
    () => 0.5
  );
  const slow = computeBotDelayMs(
    { legalActionCount: 5, complexity: 0.6, reactionSpeed: 0.2 },
    () => 0.5
  );
  expect(fast).toBeLessThan(slow);
});
~~~

Keep the hard 15,000 ms ceiling test.

- [ ] **Step 2: Run the timing test and verify RED**

Run: npm test -- tests/controllers/bot-delay.test.ts  
Expected: FAIL until reactionSpeed is accepted.

- [ ] **Step 3: Implement reaction-speed scaling**

Compute the existing complexity/ambiguity score, then scale the min/max band by a factor derived from reactionSpeed while clamping final output to 300..15000 ms. Do not add any connection-lag branch.

- [ ] **Step 4: Store per-seat personalities in MultiplayerTableScreen**

Create controllers once from state.seed plus participantId and read controller.personality.reactionSpeed when computing delay. Do not recreate personality on every render.

- [ ] **Step 5: Run timing and UI bot tests**

Run: npm test -- tests/controllers/bot-delay.test.ts tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/controllers/bot-delay.ts src/ui/MultiplayerTableScreen.tsx tests/controllers/bot-delay.test.ts tests/ui/MultiplayerTableScreen.test.tsx
git commit -m "feat: vary bot thinking time by personality"
~~~

### Task 5: Add rare rule-safe AI surrender for 2/3/4 players

**Files:**
- Create: src/controllers/bot-surrender.ts
- Create: tests/controllers/bot-surrender.test.ts
- Create: src/rules/multiplayer-surrender.ts
- Create: tests/rules/multiplayer-surrender.test.ts
- Modify: src/core/multiplayer-game-types.ts
- Modify: src/rules/multiplayer-resolution.ts
- Modify: src/save/multiplayer-match-save.ts
- Modify: tests/save/multiplayer-match-save.test.ts
- Modify: tests/simulation/podkidnoy-multiplayer.sim.test.ts
- Modify: src/ui/MultiplayerTableScreen.tsx

**Interfaces:**
- Produces: shouldBotSurrender(view, personality, random): boolean
- Produces: applyParticipantSurrender(state, participantId): MultiplayerGameState
- State schema v3 adds forfeitPile and forfeitOrder.

~~~ts
export type MultiplayerGameState = Readonly<{
  // existing fields...
  schemaVersion: 3;
  forfeitPile: readonly Card[];
  forfeitOrder: readonly ParticipantId[];
}>;
~~~

- [ ] **Step 1: Write RED surrender-policy tests**

~~~ts
it("never surrenders before the late-game threshold", () => {
  const view = makeLateLosingView({ turnNumber: 6 });
  expect(shouldBotSurrender(view, HIGH_QUIT_PERSONALITY, () => 0))
    .toBe(false);
});

it("never surrenders from a competitive position", () => {
  const view = makeCompetitiveView({ turnNumber: 40 });
  expect(shouldBotSurrender(view, HIGH_QUIT_PERSONALITY, () => 0))
    .toBe(false);
});
~~~

Initial release gate: turnNumber >= 20, talonCount === 0, bot card count >= 4, at least one opponent card count <= 1, then a final random gate using personality.quitTendency.

- [ ] **Step 2: Run policy tests and verify RED**

Run: npm test -- tests/controllers/bot-surrender.test.ts  
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement shouldBotSurrender from MultiplayerPublicView only**

The function must not accept MultiplayerGameState. It returns false for finished views, early turns, non-losing positions, or a failed random gate.

- [ ] **Step 4: Write RED state tests for 2/3/4-player surrender**

Cover:
- 2-player surrender ends immediately with surrendering seat as fool;
- 3/4-player surrender moves every hidden hand card from that participant into forfeitPile, empties that hand, appends the id to forfeitOrder, and continues if at least two non-forfeited active participants remain;
- activePlayerId, attackerId, and defenderId are reassigned to legal non-forfeited seats when the surrendering participant held one of those roles;
- total physical-card conservation includes hands + talon + discard + table + forfeitPile.

- [ ] **Step 5: Implement applyParticipantSurrender**

Use a helper activeCompetitiveParticipants(state) that excludes finishOrder and forfeitOrder. Move the surrendering hand to forfeitPile without exposing it through MultiplayerPublicView.

When only one non-forfeited participant remains, append that remaining participant to finishOrder, set phase to finished, and set foolId to the most recently forfeited participant. This makes the quitter occupy the lowest remaining place while the last honest participant receives the next legitimate placement.

- [ ] **Step 6: Migrate save schema v2 -> v3**

In loadCurrentMultiplayerMatch, accept schemaVersion 2 and return schemaVersion 3 with:

~~~ts
forfeitPile: [],
forfeitOrder: []
~~~

Validate that forfeited participants are unique active ids and that forfeitPile contains no duplicate physical card ids.

- [ ] **Step 7: Extend simulation invariants**

Update physical-card conservation checks so all 36 ids are counted across hands, talon, discard, table, and forfeitPile. Add a seeded simulation that injects one surrender in a 4-player match and still reaches a finished state without duplicate cards or illegal active ids.

- [ ] **Step 8: Integrate the rare surrender check before scheduling an AI action**

Evaluate at most once per AI turn. If true, applyParticipantSurrender instead of requesting a card action and surface neutral copy based on the seat nickname. Do not show fake disconnect/reconnect language.

- [ ] **Step 9: Run focused tests**

Run: npm test -- tests/controllers/bot-surrender.test.ts tests/rules/multiplayer-surrender.test.ts tests/save/multiplayer-match-save.test.ts tests/simulation/podkidnoy-multiplayer.sim.test.ts tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 10: Commit**

~~~bash
git add src/controllers/bot-surrender.ts src/rules/multiplayer-surrender.ts src/core/multiplayer-game-types.ts src/rules/multiplayer-resolution.ts src/save/multiplayer-match-save.ts src/ui/MultiplayerTableScreen.tsx tests
git commit -m "feat: add rare AI surrender with card conservation"
~~~

### Task 6: Animate the resolved final bout before result reveal

**Files:**
- Create: src/ui/match-presentation-event.ts
- Create: tests/ui/match-presentation-event.test.ts
- Create: src/ui/use-result-reveal.ts
- Create: tests/ui/use-result-reveal.test.tsx
- Modify: src/ui/MultiplayerTableScreen.tsx
- Modify: tests/ui/MultiplayerTableScreen.test.tsx

**Interfaces:**
- Produces: derivePresentationEvent(before, action, after): MatchPresentationEvent | null
- Produces: resultVisible boolean only after the resolution event animation completes.

~~~ts
export type MatchPresentationEvent =
  | Readonly<{
      type: "bout-taken";
      cards: readonly Card[];
      defenderId: ParticipantId;
      turnNumber: number;
    }>
  | Readonly<{
      type: "bout-discarded";
      cards: readonly Card[];
      turnNumber: number;
    }>;
~~~

- [ ] **Step 1: Write RED event-derivation tests**

Create before/after states where the table is non-empty before the action and empty afterward. Assert:
- taking resolution produces bout-taken with the exact pre-resolution table cards and defender id;
- successful defense produces bout-discarded with the exact pre-resolution table cards;
- ordinary attack/defense actions that leave cards on the table produce null.

- [ ] **Step 2: Run focused event tests**

Run: npm test -- tests/ui/match-presentation-event.test.ts  
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement derivePresentationEvent**

Derive only from before/action/after. Do not add presentation-only fields to MultiplayerGameState.

- [ ] **Step 4: Add a RED UI test for the final Take path**

Use fake timers. Drive a final taking resolution and assert:
- immediately after the resolving action, the result dialog is absent;
- a presentation layer still contains the resolved table cards while animation runs;
- only after animationMs plus the short reveal delay does the result dialog appear.

- [ ] **Step 5: Run the focused UI test**

Run: npm test -- tests/ui/MultiplayerTableScreen.test.tsx  
Expected: FAIL because current state clears the table and renders result immediately.

- [ ] **Step 6: Capture before/after state inside commitAction**

Compute next = applyMultiplayerAction(current, action), derive the presentation event from current/action/next, store it in UI state, then commit next. While the event is active, render ghost/transit cards from the captured event even though the authoritative table is already cleared.

- [ ] **Step 7: Implement useResultReveal**

The hook keeps result hidden while:
- phase is not finished;
- a final MatchPresentationEvent is active;
- the normal action animation is still active.

After those complete, wait a short 180 ms reveal delay, then show the result. Clear timers/event state on restart and unmount.

- [ ] **Step 8: Run focused and rule tests**

Run: npm test -- tests/ui/match-presentation-event.test.ts tests/ui/use-result-reveal.test.tsx tests/ui/MultiplayerTableScreen.test.tsx tests/rules/multiplayer-reducer.test.ts  
Expected: PASS.

- [ ] **Step 9: Commit**

~~~bash
git add src/ui/match-presentation-event.ts src/ui/use-result-reveal.ts src/ui/MultiplayerTableScreen.tsx tests/ui
git commit -m "fix: animate final bout before showing result"
~~~

### Task 7: Gameplay/AI checkpoint

- [ ] Run: npm test -- tests/rules tests/controllers tests/ui/MultiplayerTableScreen.test.tsx
- [ ] Run: npm run typecheck
- [ ] Run: npm run build
- [ ] Run: npm test
- [ ] Record exact output in the execution log before moving to the progression plan.
