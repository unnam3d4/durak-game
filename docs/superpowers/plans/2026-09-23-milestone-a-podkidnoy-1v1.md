# Milestone A — 1v1 Podkidnoy Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, testable browser vertical slice of 1v1 Podkidnoy Durak with fair reproducible dealing, authoritative rules, one human seat, one non-cheating bot seat, a 20-second turn timer, match save/restore, and a presentable responsive table UI.

**Architecture:** The game core is a pure TypeScript state machine with no React, browser storage, Yandex SDK, or DOM dependencies. UI and controllers consume public interfaces from the core. Randomness is injected and reproducible from a Web Crypto-derived seed. Persistence serializes versioned domain state, and the first bot only receives its own private hand plus public information.

**Tech Stack:** TypeScript 5+, React 19, Vite 7, Vitest 3+, jsdom for UI tests, CSS Modules or plain scoped CSS, browser Web Crypto, localStorage behind an adapter.

**Spec:** `docs/superpowers/specs/2026-09-23-durak-game-design.md`

## Global Constraints

- v1 deck size is exactly 36 cards: ranks 6, 7, 8, 9, 10, J, Q, K, A across four suits.
- v1 supports Podkidnoy and Perevodnoy overall, but this plan implements only 1v1 Podkidnoy.
- Fair dealing is mandatory: no deck manipulation based on player strength, rank, balance, ad behavior, or prior results.
- Shuffle is Fisher–Yates; production seed comes from Web Crypto where available.
- Bot APIs must not expose the human player's hidden hand.
- Human turn limit is exactly 20 seconds.
- Bot visible response delay never exceeds 15 seconds.
- No avatars.
- No wagering.
- Core rules must not import React, Yandex SDK, ads, or storage code.
- Mobile + desktop responsive UI is required.
- No temporary “dev UI” may be treated as the milestone's final presentation.

## Review Focus

1. **Reload during defense:** restoring a match must preserve table cards, active player, defender, deck order, and timer turn ownership; Task 8 includes a round-trip restore test for an in-progress defense.
2. **Defender starts with fewer than six cards:** attack-card cap must use `min(6, defenderHandSizeAtBoutStart)`; Task 4 includes a legal-action test with a three-card defender.
3. **Deck exhaustion + both hands empty:** if both players finish empty after the same bout, result must be a draw; Task 5 includes an explicit draw test.
4. **Bot privacy boundary:** changing the human hidden hand while keeping the public view identical must not change what data reaches `BotController`; Task 6 includes a structural privacy test.
5. **Timer starts after animation completion:** UI must not consume thinking time while the previous card animation is running; Task 9 includes a fake-timer UI test that starts countdown only after the animation-complete callback.

---

## File Structure

Create this structure during the plan:

```text
src/
  app/
    App.tsx
    app.css
  core/
    cards.ts
    game-types.ts
    public-view.ts
  deck/
    deck.ts
    random.ts
  rules/
    create-match.ts
    legal-actions.ts
    reducer.ts
    resolution.ts
  controllers/
    player-controller.ts
    human-controller.ts
    bot-controller.ts
    bot-delay.ts
  timer/
    turn-timer.ts
  save/
    match-save.ts
    storage.ts
  ui/
    TableScreen.tsx
    CardView.tsx
    PlayerSeat.tsx
    TurnTimer.tsx
    table.css
  main.tsx
tests/
  deck/
  rules/
  controllers/
  timer/
  save/
  ui/
vite.config.ts
vitest.config.ts
tsconfig.json
package.json
index.html
```

Each file has one responsibility:

- `core/cards.ts`: immutable card/suit/rank types and comparison helpers.
- `core/game-types.ts`: canonical domain state/action/result types.
- `core/public-view.ts`: player-safe state projection; this enforces hidden information.
- `deck/deck.ts`: 36-card creation, deterministic shuffle, deal operations.
- `deck/random.ts`: Web Crypto seed and deterministic seeded RNG.
- `rules/create-match.ts`: initial state construction and first-attacker selection.
- `rules/legal-actions.ts`: one authoritative legality generator.
- `rules/reducer.ts`: deterministic action application.
- `rules/resolution.ts`: bout cleanup, refill order, next attacker, terminal result.
- `controllers/*`: human/bot action sources and bot presentation delay.
- `timer/turn-timer.ts`: engine-independent 20-second deadline state.
- `save/*`: versioned serialization and browser storage adapter.
- `ui/*`: presentation and interaction only.
- `app/*`: application orchestration.

---

### Task 1: Bootstrap the app and lock domain primitives

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/core/cards.ts`
- Test: `tests/core/cards.test.ts`

**Interfaces:**
- Consumes: none.
- Produces:
  - `type Suit = "clubs" | "diamonds" | "hearts" | "spades"`
  - `type Rank = 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14`
  - `type Card = Readonly<{ id: string; suit: Suit; rank: Rank }>`
  - `SUITS: readonly Suit[]`
  - `RANKS: readonly Rank[]`
  - `compareSameSuit(a: Card, b: Card): number`

- [ ] **Step 1: Write the failing card primitive test**

Create `tests/core/cards.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RANKS, SUITS, compareSameSuit, type Card } from "../../src/core/cards";

describe("card primitives", () => {
  it("defines the 36-card rank/suit domain", () => {
    expect(SUITS).toEqual(["clubs", "diamonds", "hearts", "spades"]);
    expect(RANKS).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(SUITS.length * RANKS.length).toBe(36);
  });

  it("compares cards of the same suit by rank", () => {
    const six: Card = { id: "clubs-6", suit: "clubs", rank: 6 };
    const ace: Card = { id: "clubs-14", suit: "clubs", rank: 14 };
    expect(compareSameSuit(ace, six)).toBeGreaterThan(0);
  });

  it("rejects cross-suit comparison", () => {
    const clubs: Card = { id: "clubs-6", suit: "clubs", rank: 6 };
    const hearts: Card = { id: "hearts-6", suit: "hearts", rank: 6 };
    expect(() => compareSameSuit(clubs, hearts)).toThrow("same suit");
  });
});
```

- [ ] **Step 2: Add project manifests and run the test to verify RED**

Create `package.json`:

```json
{
  "name": "durak-game",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --pretty false"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "jsdom": "^26.1.0",
    "typescript": "^5.9.2",
    "vite": "^7.1.5",
    "vitest": "^3.2.4"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { target: "es2022" }
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: []
  }
});
```

Create minimal `index.html`, `src/main.tsx`, and `src/app/App.tsx` sufficient to render `<div>Durak</div>`.

Run:

```bash
npm install
npm test -- tests/core/cards.test.ts
```

Expected: FAIL because `src/core/cards.ts` does not exist.

- [ ] **Step 3: Implement card primitives**

Create `src/core/cards.ts`:

```ts
export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export type Card = Readonly<{
  id: string;
  suit: Suit;
  rank: Rank;
}>;

export function compareSameSuit(a: Card, b: Card): number {
  if (a.suit !== b.suit) throw new Error("Cards must have the same suit");
  return a.rank - b.rank;
}
```

- [ ] **Step 4: Verify tests and typecheck**

Run:

```bash
npm test -- tests/core/cards.test.ts
npm run typecheck
```

Expected: 3 tests PASS; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src tests
git commit -m "chore: bootstrap Durak web app"
```

---

### Task 2: Build a fair reproducible 36-card deck

**Files:**
- Create: `src/deck/random.ts`
- Create: `src/deck/deck.ts`
- Test: `tests/deck/deck.test.ts`

**Interfaces:**
- Consumes: `Card`, `SUITS`, `RANKS`.
- Produces:
  - `type RandomSource = () => number` returning `0 <= n < 1`
  - `createCryptoSeed(): number`
  - `createSeededRandom(seed: number): RandomSource`
  - `createDeck36(): Card[]`
  - `shuffleDeck(deck: readonly Card[], random: RandomSource): Card[]`

- [ ] **Step 1: Write failing deck tests**

Create `tests/deck/deck.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDeck36, shuffleDeck } from "../../src/deck/deck";
import { createSeededRandom } from "../../src/deck/random";

describe("36-card deck", () => {
  it("contains exactly 36 unique cards", () => {
    const deck = createDeck36();
    expect(deck).toHaveLength(36);
    expect(new Set(deck.map((card) => card.id)).size).toBe(36);
  });

  it("does not mutate the source deck", () => {
    const deck = createDeck36();
    const sourceIds = deck.map((c) => c.id);
    shuffleDeck(deck, createSeededRandom(123));
    expect(deck.map((c) => c.id)).toEqual(sourceIds);
  });

  it("is reproducible from the same seed", () => {
    const deck = createDeck36();
    const a = shuffleDeck(deck, createSeededRandom(987654));
    const b = shuffleDeck(deck, createSeededRandom(987654));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it("changes order for a different seed", () => {
    const deck = createDeck36();
    const a = shuffleDeck(deck, createSeededRandom(1));
    const b = shuffleDeck(deck, createSeededRandom(2));
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run:

```bash
npm test -- tests/deck/deck.test.ts
```

Expected: FAIL with missing modules/functions.

- [ ] **Step 3: Implement seeded RNG and Web Crypto seed**

Create `src/deck/random.ts`:

```ts
export type RandomSource = () => number;

export function createCryptoSeed(): number {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Web Crypto is required for production match seeding");
  }
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return value[0]!;
}

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}
```

Create `src/deck/deck.ts`:

```ts
import { RANKS, SUITS, type Card } from "../core/cards";
import type { RandomSource } from "./random";

export function createDeck36(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({ id: `${suit}-${rank}`, suit, rank }))
  );
}

export function shuffleDeck(deck: readonly Card[], random: RandomSource): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
```

- [ ] **Step 4: Verify tests**

Run:

```bash
npm test -- tests/deck/deck.test.ts
npm run typecheck
```

Expected: 4 tests PASS; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/deck tests/deck
git commit -m "feat: add fair reproducible deck shuffle"
```

---

### Task 3: Create initial 1v1 match state and choose first attacker

**Files:**
- Create: `src/core/game-types.ts`
- Create: `src/rules/create-match.ts`
- Test: `tests/rules/create-match.test.ts`

**Interfaces:**
- Consumes: `Card`, deck/random functions.
- Produces:
  - `type PlayerId = "human" | "bot"`
  - `type MatchPhase = "attack" | "defend" | "throw-in" | "finished"`
  - `type TablePair = { attack: Card; defense?: Card }`
  - `type MatchResult = { kind: "winner"; winner: PlayerId; loser: PlayerId } | { kind: "draw" } | { kind: "technical-loss"; loser: PlayerId; winner: PlayerId }`
  - `type GameState`
  - `createMatch1v1(seed: number): GameState`

- [ ] **Step 1: Write failing initialization tests**

Create `tests/rules/create-match.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMatch1v1 } from "../../src/rules/create-match";

describe("createMatch1v1", () => {
  it("deals six cards to each player and exposes one trump card", () => {
    const state = createMatch1v1(12345);
    expect(state.hands.human).toHaveLength(6);
    expect(state.hands.bot).toHaveLength(6);
    expect(state.talon).toHaveLength(24);
    expect(state.trumpCard).toBeDefined();
    expect(state.phase).toBe("attack");
    expect(state.table).toEqual([]);
  });

  it("preserves all 36 cards exactly once across zones", () => {
    const state = createMatch1v1(99);
    const ids = [
      ...state.hands.human,
      ...state.hands.bot,
      ...state.talon
    ].map((c) => c.id);
    expect(ids).toHaveLength(36);
    expect(new Set(ids).size).toBe(36);
  });

  it("assigns first attacker to the holder of the lowest trump", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const state = createMatch1v1(seed);
      const trumpSuit = state.trumpCard.suit;
      const lowest = (["human", "bot"] as const)
        .flatMap((id) => state.hands[id].map((card) => ({ id, card })))
        .filter(({ card }) => card.suit === trumpSuit)
        .sort((a, b) => a.card.rank - b.card.rank)[0];
      if (lowest) expect(state.attackerId).toBe(lowest.id);
    }
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run:

```bash
npm test -- tests/rules/create-match.test.ts
```

Expected: FAIL because game state/createMatch are missing.

- [ ] **Step 3: Implement canonical state types**

Create `src/core/game-types.ts`:

```ts
import type { Card } from "./cards";

export type PlayerId = "human" | "bot";
export type MatchPhase = "attack" | "defend" | "throw-in" | "finished";

export type TablePair = Readonly<{
  attack: Card;
  defense?: Card;
}>;

export type MatchResult =
  | Readonly<{ kind: "winner"; winner: PlayerId; loser: PlayerId }>
  | Readonly<{ kind: "draw" }>
  | Readonly<{ kind: "technical-loss"; loser: PlayerId; winner: PlayerId }>;

export type GameState = Readonly<{
  schemaVersion: 1;
  seed: number;
  hands: Readonly<Record<PlayerId, readonly Card[]>>;
  talon: readonly Card[];
  trumpCard: Card;
  discard: readonly Card[];
  table: readonly TablePair[];
  attackerId: PlayerId;
  defenderId: PlayerId;
  activePlayerId: PlayerId;
  phase: MatchPhase;
  defenderHandSizeAtBoutStart: number;
  result: MatchResult | null;
  turnNumber: number;
}>;
```

- [ ] **Step 4: Implement deterministic match creation**

Create `src/rules/create-match.ts` with helpers that:

1. build and shuffle the deck;
2. deal six to human, six to bot in alternating order;
3. keep the remaining ordered cards as `talon`, with `talon[0]` defined as the next draw and the last card also remaining part of the talon until drawn;
4. use the bottom visible trump card as `trumpCard`;
5. find the lowest trump in the two starting hands and set that holder as attacker;
6. use `human` as deterministic fallback attacker only if neither hand contains a trump.

Use this concrete signature:

```ts
export function createMatch1v1(seed: number): GameState
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- tests/rules/create-match.test.ts
npm run typecheck
```

Expected: all create-match tests PASS; typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/core/game-types.ts src/rules/create-match.ts tests/rules/create-match.test.ts
git commit -m "feat: create deterministic 1v1 match state"
```

---

### Task 4: Generate authoritative legal attack and defense actions

**Files:**
- Create: `src/rules/legal-actions.ts`
- Test: `tests/rules/legal-actions.test.ts`

**Interfaces:**
- Consumes: `GameState`, `PlayerId`, `Card`.
- Produces:
  - `type GameAction = PlayAttack | PlayDefense | Take | FinishBout`
  - `getLegalActions(state: GameState, playerId: PlayerId): readonly GameAction[]`
  - `canBeat(attack: Card, defense: Card, trumpSuit: Suit): boolean`

Use action shapes:

```ts
export type GameAction =
  | { type: "play-attack"; playerId: PlayerId; cardId: string }
  | { type: "play-defense"; playerId: PlayerId; attackCardId: string; cardId: string }
  | { type: "take"; playerId: PlayerId }
  | { type: "finish-bout"; playerId: PlayerId };
```

- [ ] **Step 1: Write failing legality tests**

Create tests covering these exact cases:

```ts
it("allows any single card as the opening attack", () => {
  const state = makeState({ phase: "attack", table: [], activePlayerId: "human" });
  const actions = getLegalActions(state, "human");
  expect(actions.filter((a) => a.type === "play-attack")).toHaveLength(state.hands.human.length);
});

it("defends with a higher same-suit card", () => {
  expect(canBeat(card("hearts", 9), card("hearts", 10), "spades")).toBe(true);
});

it("defends a non-trump with any trump", () => {
  expect(canBeat(card("hearts", 14), card("spades", 6), "spades")).toBe(true);
});

it("cannot beat a trump with a non-trump", () => {
  expect(canBeat(card("spades", 6), card("hearts", 14), "spades")).toBe(false);
});

it("only permits throw-ins whose rank is already on the table", () => {
  // table contains ranks 7 and 10; only matching ranks from attacker hand are legal
});

it("caps total attack cards to a defender starting with only three cards", () => {
  const state = makeState({
    phase: "throw-in",
    defenderHandSizeAtBoutStart: 3,
    table: [
      { attack: card("clubs", 6), defense: card("clubs", 7) },
      { attack: card("diamonds", 7), defense: card("diamonds", 8) },
      { attack: card("hearts", 8), defense: card("hearts", 9) }
    ]
  });
  expect(getLegalActions(state, state.attackerId).some((a) => a.type === "play-attack")).toBe(false);
});
```

Include a local deterministic `makeState` helper in the test file that creates only valid minimal states.

- [ ] **Step 2: Run to verify RED**

Run:

```bash
npm test -- tests/rules/legal-actions.test.ts
```

Expected: FAIL with missing exports.

- [ ] **Step 3: Implement `canBeat` and `getLegalActions` minimally**

Rules to encode:

- only `activePlayerId` may act;
- opening attacker may play any one card;
- defender may defend any unbeaten attack with a legal beating card or choose `take`;
- after every attack card is beaten, attacker may either throw in a rank already visible on the table, subject to cap, or `finish-bout`;
- attack cap is `Math.min(6, defenderHandSizeAtBoutStart)`;
- return an empty array for a non-active player or finished state.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- tests/rules/legal-actions.test.ts
npm run typecheck
```

Expected: all legality tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rules/legal-actions.ts tests/rules/legal-actions.test.ts
git commit -m "feat: add authoritative Podkidnoy legal actions"
```

---

### Task 5: Apply actions, resolve bouts, refill, and finish matches

**Files:**
- Create: `src/rules/reducer.ts`
- Create: `src/rules/resolution.ts`
- Test: `tests/rules/reducer.test.ts`
- Test: `tests/rules/endgame.test.ts`

**Interfaces:**
- Consumes: `GameState`, `GameAction`, `getLegalActions`.
- Produces:
  - `applyAction(state: GameState, action: GameAction): GameState`
  - `resolveSuccessfulBout(state: GameState): GameState`
  - `resolveTake(state: GameState): GameState`
  - `refillHands(state: GameState): GameState`
  - `resolveMatchResult(state: GameState): GameState`

- [ ] **Step 1: Write failing reducer tests**

Include exact tests:

```ts
it("moves an attacking card from hand onto the table", () => { /* assert zones */ });
it("moves a defense card onto the targeted pair", () => { /* assert zones */ });
it("rejects an action not present in getLegalActions", () => {
  expect(() => applyAction(state, illegalAction)).toThrow("Illegal action");
});
it("take moves every table card into defender hand and keeps attacker as next attacker", () => { /* assert */ });
it("successful defense discards table and makes old defender the next attacker", () => { /* assert */ });
it("refills attacker first and defender last up to six cards", () => { /* assert exact draw order */ });
```

- [ ] **Step 2: Write failing endgame tests**

In `tests/rules/endgame.test.ts`:

```ts
it("declares the player with cards the loser after talon is empty", () => { /* human empty, bot has cards -> human wins */ });

it("declares a draw when both hands become empty after the same resolved bout", () => {
  const next = resolveMatchResult(makeExhaustedState({ human: [], bot: [] }));
  expect(next.result).toEqual({ kind: "draw" });
  expect(next.phase).toBe("finished");
});
```

- [ ] **Step 3: Run to verify RED**

Run:

```bash
npm test -- tests/rules/reducer.test.ts tests/rules/endgame.test.ts
```

Expected: FAIL with missing reducers.

- [ ] **Step 4: Implement reducer and bout resolution**

`applyAction` must:

- validate by deep-equaling the requested action against `getLegalActions`;
- remove played cards from the acting hand;
- update table/phase/active player deterministically;
- route `take` to `resolveTake`;
- route `finish-bout` to `resolveSuccessfulBout`;
- increment `turnNumber` only after a successful state transition.

`refillHands` must draw from `talon[0]` in attacker-first, defender-last order.

`resolveMatchResult` runs only after bout cleanup/refill and only treats empty hands as finished when the talon is empty.

- [ ] **Step 5: Verify reducer, endgame, and earlier rule tests**

Run:

```bash
npm test -- tests/rules
npm run typecheck
```

Expected: all rules tests PASS; typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/rules/reducer.ts src/rules/resolution.ts tests/rules
git commit -m "feat: resolve Podkidnoy bouts and match endgame"
```

---

### Task 6: Enforce bot privacy and add a basic legal-action bot

**Files:**
- Create: `src/core/public-view.ts`
- Create: `src/controllers/player-controller.ts`
- Create: `src/controllers/human-controller.ts`
- Create: `src/controllers/bot-controller.ts`
- Create: `src/controllers/bot-delay.ts`
- Test: `tests/controllers/bot-controller.test.ts`
- Test: `tests/controllers/bot-delay.test.ts`

**Interfaces:**
- Consumes: `GameState`, `GameAction`, `getLegalActions`.
- Produces:
  - `type PublicGameView`
  - `toPlayerView(state: GameState, viewerId: PlayerId): PublicGameView`
  - `interface PlayerController { requestAction(view: PublicGameView): Promise<GameAction> }`
  - `class BotController implements PlayerController`
  - `computeBotDelayMs(input: BotDelayInput, random: RandomSource): number`

`PublicGameView` must contain:

```ts
type PublicGameView = Readonly<{
  viewerId: PlayerId;
  ownHand: readonly Card[];
  opponentCardCounts: Readonly<Record<PlayerId, number>>;
  talonCount: number;
  trumpCard: Card;
  discardCount: number;
  table: readonly TablePair[];
  attackerId: PlayerId;
  defenderId: PlayerId;
  activePlayerId: PlayerId;
  phase: MatchPhase;
  legalActions: readonly GameAction[];
  turnNumber: number;
}>;
```

It must not contain `hands` or opponent hidden cards.

- [ ] **Step 1: Write failing privacy and bot tests**

Include:

```ts
it("does not expose the human hidden hand to a bot view", () => {
  const view = toPlayerView(state, "bot");
  expect("hands" in view).toBe(false);
  expect(view.ownHand).toEqual(state.hands.bot);
  expect(JSON.stringify(view)).not.toContain(state.hands.human[0]!.id);
});

it("produces the same bot-visible shape when only hidden human cards change", () => {
  const a = toPlayerView(stateA, "bot");
  const b = toPlayerView(stateBWithSamePublicFacts, "bot");
  expect({ ...a, legalActions: a.legalActions }).toEqual({ ...b, legalActions: b.legalActions });
});

it("returns only a legal action", async () => {
  const controller = new BotController(() => 0.5);
  const action = await controller.requestAction(toPlayerView(state, "bot"));
  expect(toPlayerView(state, "bot").legalActions).toContainEqual(action);
});
```

- [ ] **Step 2: Write failing delay tests**

```ts
it("keeps obvious decisions in the fast band", () => {
  expect(computeBotDelayMs({ legalActionCount: 1, complexity: 0 }, () => 0.5)).toBeLessThanOrEqual(1200);
});

it("never exceeds 15 seconds", () => {
  expect(computeBotDelayMs({ legalActionCount: 12, complexity: 1 }, () => 0.999999)).toBeLessThanOrEqual(15000);
});
```

- [ ] **Step 3: Run to verify RED**

Run:

```bash
npm test -- tests/controllers
```

Expected: FAIL with missing controller/view code.

- [ ] **Step 4: Implement public projection and baseline bot**

Baseline move policy for Milestone A:

- if only one legal action: choose it;
- defense: prefer lowest-rank non-trump legal defense, then lowest trump;
- opening attack: prefer lowest non-trump, then lowest trump;
- throw-in: prefer lowest legal card;
- when `take` competes with valid defense, defend if possible;
- when all attacks are defended, choose `finish-bout` unless a legal throw-in of rank <= 10 exists.

The baseline bot does not need deep search yet.

- [ ] **Step 5: Implement delay calculation**

Use complexity bands with jitter:

```ts
const MAX_BOT_DELAY_MS = 15_000;

export function computeBotDelayMs(
  input: BotDelayInput,
  random: RandomSource
): number {
  const ambiguity = Math.min(1, Math.max(0, (input.legalActionCount - 1) / 8));
  const score = Math.min(1, Math.max(0, input.complexity * 0.7 + ambiguity * 0.3));
  const min = 300 + score * 2700;
  const max = 1200 + score * 13_800;
  return Math.min(MAX_BOT_DELAY_MS, Math.round(min + (max - min) * random()));
}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm test -- tests/controllers
npm run typecheck
```

Expected: controller/privacy/delay tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/public-view.ts src/controllers tests/controllers
git commit -m "feat: add non-cheating bot controller"
```

---

### Task 7: Add the exact 20-second turn deadline

**Files:**
- Create: `src/timer/turn-timer.ts`
- Test: `tests/timer/turn-timer.test.ts`
- Modify: `src/rules/reducer.ts`
- Modify: `src/core/game-types.ts`
- Test: `tests/rules/timeout.test.ts`

**Interfaces:**
- Consumes: `PlayerId`, `GameState`.
- Produces:
  - `TURN_LIMIT_MS = 20_000`
  - `createTurnDeadline(startedAtMs: number): number`
  - `remainingTurnMs(deadlineMs: number, nowMs: number): number`
  - `applyTimeoutLoss(state: GameState, playerId: PlayerId): GameState`

- [ ] **Step 1: Write failing timer tests**

```ts
it("creates an exact 20-second deadline", () => {
  expect(createTurnDeadline(1_000)).toBe(21_000);
});

it("clamps remaining time at zero", () => {
  expect(remainingTurnMs(21_000, 22_000)).toBe(0);
});
```

- [ ] **Step 2: Write failing timeout-result test**

```ts
it("marks a human timeout as a technical loss", () => {
  const next = applyTimeoutLoss(state, "human");
  expect(next.phase).toBe("finished");
  expect(next.result).toEqual({
    kind: "technical-loss",
    loser: "human",
    winner: "bot"
  });
});
```

- [ ] **Step 3: Run to verify RED**

Run:

```bash
npm test -- tests/timer/turn-timer.test.ts tests/rules/timeout.test.ts
```

Expected: FAIL with missing timer functions.

- [ ] **Step 4: Implement pure timer helpers and timeout transition**

Do not put `setInterval` in the domain layer. The domain stores no wall-clock singleton. UI/orchestrator owns ticking; it calls these pure helpers.

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- tests/timer tests/rules/timeout.test.ts
npm run typecheck
```

Expected: timer and timeout tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/timer src/core/game-types.ts src/rules/reducer.ts tests/timer tests/rules/timeout.test.ts
git commit -m "feat: enforce 20 second turn limit"
```

---

### Task 8: Save and restore an unfinished match exactly

**Files:**
- Create: `src/save/match-save.ts`
- Create: `src/save/storage.ts`
- Test: `tests/save/match-save.test.ts`

**Interfaces:**
- Consumes: `GameState`.
- Produces:
  - `type MatchSaveV1 = { schemaVersion: 1; savedAtMs: number; state: GameState }`
  - `serializeMatch(state: GameState, savedAtMs: number): string`
  - `deserializeMatch(serialized: string): MatchSaveV1`
  - `interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }`
  - `saveCurrentMatch(storage: KeyValueStorage, state: GameState, nowMs: number): void`
  - `loadCurrentMatch(storage: KeyValueStorage): GameState | null`

- [ ] **Step 1: Write failing round-trip tests**

```ts
it("round-trips an in-progress defense without changing state", () => {
  const state = makeDefenseStateWithCardsOnTable();
  const encoded = serializeMatch(state, 123456);
  const decoded = deserializeMatch(encoded);
  expect(decoded.state).toEqual(state);
});

it("preserves deck order, table, active player, and defender after reload", () => {
  const state = makeDefenseStateWithCardsOnTable();
  const storage = createMemoryStorage();
  saveCurrentMatch(storage, state, 555);
  const restored = loadCurrentMatch(storage)!;
  expect(restored.talon.map((c) => c.id)).toEqual(state.talon.map((c) => c.id));
  expect(restored.table).toEqual(state.table);
  expect(restored.activePlayerId).toBe(state.activePlayerId);
  expect(restored.defenderId).toBe(state.defenderId);
});

it("rejects malformed or unsupported save data", () => {
  expect(() => deserializeMatch('{"schemaVersion":99}')).toThrow("Unsupported save");
});
```

- [ ] **Step 2: Run to verify RED**

Run:

```bash
npm test -- tests/save/match-save.test.ts
```

Expected: FAIL with missing save functions.

- [ ] **Step 3: Implement versioned save format**

Use a fixed key:

```ts
export const CURRENT_MATCH_KEY = "durak.currentMatch.v1";
```

Validate on deserialize at minimum:

- object exists;
- `schemaVersion === 1`;
- state schema version is 1;
- all required top-level state fields exist;
- exactly 36 unique card IDs exist across hand/talon/table/discard zones.

If validation fails, throw from `deserializeMatch`; `loadCurrentMatch` catches and returns `null` after removing the corrupt key.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- tests/save/match-save.test.ts
npm run typecheck
```

Expected: save tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/save tests/save
git commit -m "feat: persist and restore active matches"
```

---

### Task 9: Build the presentable responsive table UI and orchestrate one full match

**Files:**
- Modify: `src/app/App.tsx`
- Create: `src/app/app.css`
- Create: `src/ui/TableScreen.tsx`
- Create: `src/ui/CardView.tsx`
- Create: `src/ui/PlayerSeat.tsx`
- Create: `src/ui/TurnTimer.tsx`
- Create: `src/ui/table.css`
- Test: `tests/ui/TableScreen.test.tsx`

**Interfaces:**
- Consumes:
  - `createMatch1v1(seed)`
  - `getLegalActions`
  - `applyAction`
  - `BotController`
  - `computeBotDelayMs`
  - `createTurnDeadline`
  - save/load APIs.
- Produces:
  - `<TableScreen />` with a complete playable 1v1 match.
  - Card-click human interaction.
  - Countdown display.
  - Result overlay.
  - Resume-current-match flow.

- [ ] **Step 1: Write failing UI test for visible table state**

```tsx
it("renders human cards, bot card count, trump, talon count, and active nickname", () => {
  render(<TableScreen initialState={state} now={() => 0} />);
  expect(screen.getByText("Игрок")).toBeInTheDocument();
  expect(screen.getByText("Соперник")).toBeInTheDocument();
  expect(screen.getByText(/24/)).toBeInTheDocument();
  expect(screen.getAllByTestId("human-card")).toHaveLength(6);
});
```

- [ ] **Step 2: Write failing UI test for timer-after-animation rule**

Use fake timers:

```tsx
it("starts the new 20-second countdown only after previous action animation completes", async () => {
  vi.useFakeTimers();
  const { rerender } = render(
    <TableScreen initialState={state} now={() => Date.now()} animationMs={300} />
  );

  fireEvent.click(screen.getByTestId("human-card-0"));
  vi.advanceTimersByTime(200);
  expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

  vi.advanceTimersByTime(100);
  await Promise.resolve();
  expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");
  vi.useRealTimers();
});
```

- [ ] **Step 3: Run to verify RED**

Run:

```bash
npm test -- tests/ui/TableScreen.test.tsx
```

Expected: FAIL because UI components do not exist.

- [ ] **Step 4: Implement the table layout**

Visual baseline:

- portrait-first center table capped at a comfortable desktop width;
- graphite page background;
- deep green felt table with subtle radial lighting;
- top bot seat: nickname, rank placeholder text only, timer ring/bar, card count;
- center: attack/defense pairs, talon count, visible trump;
- bottom: large fanned human hand;
- active legal cards lift slightly and receive restrained glow;
- illegal cards remain visible but are not clickable;
- no avatars;
- no casino chips;
- no gold overload.

Use CSS transforms for card fan/hover/selected states. Use semantic buttons for clickable cards so keyboard activation works.

- [ ] **Step 5: Implement orchestration**

`TableScreen` owns:

- current `GameState`;
- animation gate;
- turn deadline;
- bot timeout handle;
- save after each applied action;
- human timeout -> `applyTimeoutLoss`;
- bot action request only after animation completion;
- bot delay capped by `computeBotDelayMs`;
- result overlay when phase becomes `finished`.

Do not put game legality in React handlers; handlers select one of the legal actions already returned by the core.

- [ ] **Step 6: Verify UI tests**

Run:

```bash
npm test -- tests/ui/TableScreen.test.tsx
npm run typecheck
```

Expected: UI tests PASS; typecheck exits 0.

- [ ] **Step 7: Run development build for visual inspection**

Run:

```bash
npm run build
```

Expected: Vite production build exits 0.

Then open the development build manually at common viewport targets:

- 390×844 mobile portrait;
- 844×390 mobile landscape;
- 1366×768 desktop.

Acceptance checks:

- all six human cards remain selectable without horizontal page scrolling;
- bot seat never overlaps talon/trump;
- table action area remains readable in portrait;
- result overlay is fully visible;
- timer is readable without dominating the table.

- [ ] **Step 8: Commit**

```bash
git add src/app src/ui tests/ui
git commit -m "feat: add polished playable 1v1 table"
```

---

### Task 10: Add full-match simulations and final Milestone A verification

**Files:**
- Create: `tests/simulation/podkidnoy-1v1.sim.test.ts`
- Create: `src/controllers/simulation-controller.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: all Milestone A core/controller APIs.
- Produces:
  - deterministic bot-vs-bot simulation helper;
  - automated invariant coverage across many matches;
  - documented local run/build/test commands.

- [ ] **Step 1: Write failing simulation test**

```ts
it("completes 1000 deterministic 1v1 matches without deadlock or card duplication", async () => {
  for (let seed = 1; seed <= 1000; seed += 1) {
    const result = await simulateMatch(seed, { maxActions: 1000 });
    expect(result.terminated).toBe(true);
    expect(result.actions).toBeLessThanOrEqual(1000);
    expect(result.cardInvariantOk).toBe(true);
    expect(result.illegalActionCount).toBe(0);
  }
});
```

- [ ] **Step 2: Run to verify RED**

Run:

```bash
npm test -- tests/simulation/podkidnoy-1v1.sim.test.ts
```

Expected: FAIL because simulator does not exist.

- [ ] **Step 3: Implement simulator**

`simulateMatch` must:

- construct `createMatch1v1(seed)`;
- use controllers that immediately choose legal actions with no UI delays;
- apply actions until `phase === "finished"` or `maxActions`;
- after every action assert card conservation:
  - collect IDs from both hands, talon, table attack/defense cards, and discard;
  - exactly 36 IDs;
  - every ID unique;
- count any thrown illegal-action exception as failure.

- [ ] **Step 4: Run simulation and whole suite**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected:

- all tests PASS;
- 1000 simulations terminate;
- typecheck exits 0;
- production build exits 0.

- [ ] **Step 5: Update README with exact commands**

Replace README body with:

```md
# durak-game

Browser implementation of classic Durak for Yandex Games.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run typecheck
npm run build
```

## Design

- Product/technical design: `docs/superpowers/specs/2026-09-23-durak-game-design.md`
- Implementation plans: `docs/superpowers/plans/`
```

- [ ] **Step 6: Re-run final verification after README change**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add src tests README.md
git commit -m "test: verify Milestone A vertical slice"
```

---

## Milestone A Completion Contract

Milestone A is complete only when all of the following are evidenced by fresh commands:

- `npm test` passes with zero failures.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.
- 1000 deterministic simulations terminate within 1000 actions each.
- Card conservation holds after every simulated action.
- Bot public view contains no human hidden-card data.
- Human timer is exactly 20 seconds and a timeout creates a technical loss.
- Bot visible delay is bounded to <= 15 seconds.
- Reload round-trip preserves an in-progress defense exactly.
- 390×844, 844×390, and 1366×768 layouts are manually inspected and remain playable.
- No rule legality is implemented in React/UI code.
- No ad, Yandex SDK, economy, rank, or nickname-generation work is pulled into this milestone.

## Deferred to Later Plans

These spec requirements intentionally remain outside Milestone A and each will receive its own implementation plan after this vertical slice is accepted:

1. Milestone B: Perevodnoy + 3/4 participants + procedural bot personalities + broader simulations.
2. Milestone C: required first-run nickname + profile + level + numeric ranks + statistics + achievements + 20,000 curated bot nicknames.
3. Milestone D: coins + cosmetic inventory + nickname styling + card backs/tables + final generated art/audio/motion polish.
4. Milestone E: Yandex Games SDK + ads + locale + guest/cloud save integration + release QA/moderation package.
