# Card Interaction and Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Deliver release-quality tap/drag card interaction, consistent participant visuals, gameplay animations, and responsive layouts suitable for Yandex Games desktop and mobile moderation.

**Architecture:** Keep all game legality in existing legalActions. Add a reusable pointer-drag hook that resolves a legal action from semantic drop targets, split the oversized table screen into focused presentational components, and use CSS transforms/transitions for card movement without storing rule state in animation components.

**Tech Stack:** React, Pointer Events, CSS, Vitest, Testing Library.

**Spec:** docs/superpowers/specs/2026-09-24-ranked-pve-release-design.md

## Global Constraints

- Every drag action must have a tap/click alternative.
- Drag begins only after a movement threshold.
- Invalid drops return visually without changing game state.
- Defense drag targets a specific uncovered attack card.
- Do not use native HTML5 Drag and Drop.
- No visual element may label an AI seat as bot/bot2/bot3.
- Small mobile widths must not create page-level horizontal scroll.
- Result reveal waits for final animation completion.

## Review Focus

- Pointer cancel or lost capture must reset drag state without playing a card.
- Dragging a card vertically must not permanently disable scrolling after release.
- An ambiguous Perevodnoy card that can defend or transfer must expose both valid interactions.
- A hand with many cards must remain selectable at 320px width.
- prefers-reduced-motion must preserve state transitions even when decorative movement is removed.

---

### Task 1: Add a reusable pointer-card interaction hook

**Files:**
- Create: src/ui/use-card-drag.ts
- Create: tests/ui/use-card-drag.test.tsx

**Interfaces:**
- Produces: useCardDrag(options)
- Emits semantic drop coordinates and target ids; it does not call game rules directly.

~~~ts
export type CardDragResult = Readonly<{
  dragging: boolean;
  x: number;
  y: number;
  startX: number;
  startY: number;
}>;

export type CardDragOptions = Readonly<{
  thresholdPx?: number;
  onDrop: (point: { x: number; y: number }) => void;
  onTap: () => void;
}>;
~~~

- [ ] **Step 1: Write RED pointer tests**

Cover:
- pointerdown + pointerup under 8 px calls onTap;
- movement beyond 8 px starts dragging and does not call onTap;
- pointercancel resets state and calls neither action;
- pointerup after drag calls onDrop once.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/ui/use-card-drag.test.tsx  
Expected: FAIL.

- [ ] **Step 3: Implement hook using Pointer Events**

Use setPointerCapture when available. Apply touch-action: none only to the actively dragged card, not the entire game surface.

- [ ] **Step 4: Run focused test**

Run: npm test -- tests/ui/use-card-drag.test.tsx  
Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/ui/use-card-drag.ts tests/ui/use-card-drag.test.tsx
git commit -m "feat: add pointer card dragging"
~~~

### Task 2: Resolve semantic drop targets through existing legal actions

**Files:**
- Create: src/ui/card-drop-targets.ts
- Create: tests/ui/card-drop-targets.test.ts
- Modify: src/ui/MultiplayerTableScreen.tsx

**Interfaces:**
- Produces: resolveCardDropAction(view, cardId, target)

~~~ts
export type CardDropTarget =
  | Readonly<{ type: "battlefield" }>
  | Readonly<{ type: "attack-card"; attackCardId: string }>;
~~~

- [ ] **Step 1: Write RED action-resolution tests**

Cover:
- opening attack card -> battlefield resolves play-attack;
- illegal card -> battlefield returns undefined;
- defense card -> matching attack target resolves play-defense with correct attackCardId;
- wrong target returns undefined;
- Perevodnoy transfer remains accessible through existing explicit transfer selection rather than silently guessing defense vs transfer.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/ui/card-drop-targets.test.ts  
Expected: FAIL.

- [ ] **Step 3: Implement by filtering view.legalActions**

Do not reimplement rank, suit, trump, transfer, or attack-cap rules.

- [ ] **Step 4: Integrate pointer drag**

Measure battlefield and uncovered attack-card elements with getBoundingClientRect at drop time. Pass the resolved action into the existing commitAction. Invalid drops only clear visual drag state.

- [ ] **Step 5: Add UI drag regression tests**

Use fireEvent.pointerDown/move/up and mocked getBoundingClientRect. Assert the same resulting table state as existing click tests.

- [ ] **Step 6: Run UI tests**

Run: npm test -- tests/ui/card-drop-targets.test.ts tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add src/ui/card-drop-targets.ts src/ui/MultiplayerTableScreen.tsx tests/ui
git commit -m "feat: play cards by mouse and touch drag"
~~~

### Task 3: Remove implementation labels and introduce seat presentation data

**Files:**
- Create: src/ui/seat-presentation.ts
- Create: tests/ui/seat-presentation.test.ts
- Modify: src/ui/PlayerSeat.tsx
- Modify: src/ui/MultiplayerTableScreen.tsx
- Modify: src/app/App.tsx
- Modify: tests/ui/MultiplayerTableScreen.test.tsx
- Modify: tests/app/App.test.tsx

**Interfaces:**
- Produces: SeatPresentation { participantId, nickname, cardCount, active, placement }

- [ ] **Step 1: Write RED test proving internal ids are absent from visible copy**

Render a four-player match with opponent seat profiles and assert the DOM contains supplied nicknames but not "Соперник 1", "Соперник 2", "bot", "bot2", or "Соперники — боты".

- [ ] **Step 2: Run focused tests**

Run: npm test -- tests/ui/seat-presentation.test.ts tests/ui/MultiplayerTableScreen.test.tsx tests/app/App.test.tsx  
Expected: FAIL against current hard-coded NAMES/footer.

- [ ] **Step 3: Implement seat-presentation mapping**

Pass opponent profiles and the player's profile nickname into MultiplayerTableScreen. Keep ParticipantId internal.

- [ ] **Step 4: Remove current menu/footer bot disclosure strings from the play surface**

Replace "Соперники — боты" with a neutral gameplay fact such as "Рейтинговые партии" where appropriate. Do not add fake online claims.

- [ ] **Step 5: Run focused tests**

Run: npm test -- tests/ui/seat-presentation.test.ts tests/ui/MultiplayerTableScreen.test.tsx tests/app/App.test.tsx  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/ui src/app/App.tsx tests/ui tests/app
git commit -m "refactor: unify participant seat presentation"
~~~

### Task 4: Split the table into focused visual components

**Files:**
- Create: src/ui/OpponentSeats.tsx
- Create: src/ui/Battlefield.tsx
- Create: src/ui/HumanHand.tsx
- Create: src/ui/ResultOverlay.tsx
- Modify: src/ui/MultiplayerTableScreen.tsx
- Modify: tests/ui/MultiplayerTableScreen.test.tsx

**Interfaces:**
- MultiplayerTableScreen owns orchestration/state.
- OpponentSeats renders seat presentations.
- Battlefield renders talon/trump/table/drop targets.
- HumanHand renders cards and delegates tap/drag callbacks.
- ResultOverlay renders result and actions only.

- [ ] **Step 1: Preserve current UI tests before extraction**

Run: npm test -- tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 2: Extract OpponentSeats with unchanged test ids**

Move opponent map rendering without changing behavior.

- [ ] **Step 3: Run UI tests**

Run: npm test -- tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 4: Extract Battlefield and HumanHand**

Preserve attack-* / defense-* / human-card test ids and ARIA labels.

- [ ] **Step 5: Run UI tests**

Run: npm test -- tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 6: Extract ResultOverlay**

Keep role="dialog", button names, and delayed reveal contract unchanged.

- [ ] **Step 7: Commit**

~~~bash
git add src/ui tests/ui/MultiplayerTableScreen.test.tsx
git commit -m "refactor: split multiplayer table presentation"
~~~

### Task 5: Implement release visual system and responsive layout

**Files:**
- Modify: src/app/app.css
- Modify: src/ui/table.css
- Modify: src/ui/multiplayer-table.css
- Modify: src/ui/CardView.tsx
- Modify: src/ui/PlayerSeat.tsx
- Modify: src/ui/MatchSearchScreen.tsx
- Modify: src/ui/NicknameOnboarding.tsx
- Modify: src/ui/ResultOverlay.tsx
- Create: tests/ui/responsive-contract.test.tsx

**Interfaces:**
- CSS custom properties define shared surface, spacing, card, typography, and motion tokens.

- [ ] **Step 1: Add structural responsive tests**

Render main menu, onboarding, search, and a 4-player table and assert:
- no element uses visible "bot" labels;
- primary buttons remain present and enabled;
- every card button has an accessible label;
- search and result copy remains visible.

These tests protect structure; actual visual quality is verified manually.

- [ ] **Step 2: Implement shared design tokens**

Define CSS variables for table felt, panel surfaces, text, muted text, spacing, card sizes, radii, and motion durations. Use clamp() for responsive card sizing.

- [ ] **Step 3: Implement responsive breakpoints**

Required manual target widths:
- 320px portrait;
- 375/390px common mobile;
- 667px landscape;
- 768px tablet;
- 1280px desktop.

At narrow widths, opponent seats wrap/compact, hand fan overlap increases, and header/footer reduce density instead of overflowing.

- [ ] **Step 4: Add card and state animations**

Add short transitions for:
- card lift on drag;
- legal-target highlight;
- card pair placement;
- taking/discard visual state;
- result panel reveal;
- match-search seat reveal.

All transitions must have a prefers-reduced-motion override that sets durations near zero.

- [ ] **Step 5: Run UI suite**

Run: npm test -- tests/ui tests/app  
Expected: PASS.

- [ ] **Step 6: Manual visual pass**

Open the production build and inspect all required widths in both Podkidnoy and Perevodnoy, including 4-player tables with large hands. Record defects before proceeding.

- [ ] **Step 7: Commit**

~~~bash
git add src/app/app.css src/ui tests/ui
git commit -m "feat: apply release visual polish and responsive layout"
~~~

### Task 6: Interaction/visual checkpoint

- [ ] Run: npm test -- tests/ui tests/app
- [ ] Run: npm test
- [ ] Run: npm run typecheck
- [ ] Run: npm run build
