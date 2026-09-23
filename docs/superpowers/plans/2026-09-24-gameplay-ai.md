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

### Task 5: Add rare rule-safe AI surrender

**Files:**
- Create: src/controllers/bot-surrender.ts
- Create: tests/controllers/bot-surrender.test.ts
- Create: src/rules/multiplayer-surrender.ts
- Create: tests/rules/multiplayer-surrender.test.ts
- Modify: src/ui/MultiplayerTableScreen.tsx

**Interfaces:**
- Produces: shouldBotSurrender(view, personality, random): boolean
- Produces: applyParticipantSurrender(state, participantId): MultiplayerGameState

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

Define the first implementation threshold as turnNumber >= 20, talonCount === 0, bot card count >= 4, and at least one opponent card count <= 1. The final random gate uses personality.quitTendency.

- [ ] **Step 2: Run policy tests and verify RED**

Run: npm test -- tests/controllers/bot-surrender.test.ts  
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement shouldBotSurrender**

The function consumes MultiplayerPublicView only. It must not accept MultiplayerGameState.

- [ ] **Step 4: Write RED reducer tests for surrender**

For 2 participants, surrender immediately finishes with the surrendering participant as fool. For 3/4 participants, remove the surrendering seat from active competition without inventing placements for others; preserve all physical cards in a new hidden surrenderedCards collection only if the state schema is intentionally migrated. If avoiding a schema migration in v1, restrict AI surrender to 2-player matches.

- [ ] **Step 5: Choose the v1-safe implementation: 2-player AI surrender only**

Implement applyParticipantSurrender only for 2-player matches:

~~~ts
export function applyParticipantSurrender(
  state: MultiplayerGameState,
  participantId: ParticipantId
): MultiplayerGameState {
  if (state.participants.length !== 2) return state;
  if (state.phase === "finished") return state;
  return {
    ...state,
    phase: "finished",
    foolId: participantId,
    activePlayerId: participantId
  };
}
~~~

Do not fake 3/4-player card redistribution before a dedicated schema design exists.

- [ ] **Step 6: Integrate the rare surrender check before scheduling an AI action**

Only evaluate once per AI turn. If true, applyParticipantSurrender instead of requesting a card action and surface neutral UI copy.

- [ ] **Step 7: Run focused tests**

Run: npm test -- tests/controllers/bot-surrender.test.ts tests/rules/multiplayer-surrender.test.ts tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add src/controllers/bot-surrender.ts src/rules/multiplayer-surrender.ts src/ui/MultiplayerTableScreen.tsx tests
git commit -m "feat: add rare two-player AI surrender"
~~~

### Task 6: Separate rule completion from result reveal

**Files:**
- Create: src/ui/use-result-reveal.ts
- Create: tests/ui/use-result-reveal.test.tsx
- Modify: src/ui/MultiplayerTableScreen.tsx
- Modify: tests/ui/MultiplayerTableScreen.test.tsx

**Interfaces:**
- Consumes: phase, animating, finalResolutionId/result transition
- Produces: resultVisible boolean

- [ ] **Step 1: Add a RED UI test**

Create a state where the final legal action finishes the match. Submit the action and assert that the result dialog is absent while animationMs has not elapsed, then present after the animation completes.

~~~ts
expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
await act(async () => vi.advanceTimersByTime(320));
expect(screen.getByRole("dialog")).toBeInTheDocument();
~~~

- [ ] **Step 2: Run the focused UI test**

Run: npm test -- tests/ui/MultiplayerTableScreen.test.tsx  
Expected: FAIL because the overlay currently renders immediately when phase becomes finished.

- [ ] **Step 3: Implement useResultReveal**

The hook resets visibility when phase is not finished. When phase becomes finished, it waits until animating is false and then waits one short reveal delay, default 180 ms, before returning true. Clear pending timers on unmount or restart.

- [ ] **Step 4: Gate the result overlay with resultVisible**

Change:

~~~tsx
{state.phase === "finished" && <ResultOverlay ... />}
~~~

to:

~~~tsx
{resultVisible && <ResultOverlay ... />}
~~~

Keep rules state immediate so save cleanup and outcome calculation remain correct.

- [ ] **Step 5: Run focused and full tests**

Run: npm test -- tests/ui/MultiplayerTableScreen.test.tsx tests/rules/multiplayer-reducer.test.ts  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/ui/use-result-reveal.ts src/ui/MultiplayerTableScreen.tsx tests/ui
git commit -m "fix: finish final animation before showing result"
~~~

### Task 7: Gameplay/AI checkpoint

- [ ] Run: npm test -- tests/rules tests/controllers tests/ui/MultiplayerTableScreen.test.tsx
- [ ] Run: npm run typecheck
- [ ] Run: npm run build
- [ ] Run: npm test
- [ ] Record exact output in the execution log before moving to the progression plan.
