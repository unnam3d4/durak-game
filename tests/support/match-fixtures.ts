import type { Card, Rank, Suit } from "../../src/core/cards";
import type { GameState } from "../../src/core/game-types";
import { createMatch1v1 } from "../../src/rules/create-match";
import { getLegalActions } from "../../src/rules/legal-actions";
import { applyAction } from "../../src/rules/reducer";

export function card(suit: Suit, rank: Rank): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createMatch1v1(424242);
  return {
    ...base,
    ...overrides,
    hands: overrides.hands ?? base.hands,
    table: overrides.table ?? base.table,
    talon: overrides.talon ?? base.talon,
    discard: overrides.discard ?? base.discard
  };
}

export function makeDefenseStateWithCardsOnTable(): GameState {
  const state = createMatch1v1(123456);
  const action = getLegalActions(state, state.attackerId).find(
    (candidate) => candidate.type === "play-attack"
  );
  if (!action || action.type !== "play-attack") {
    throw new Error("Expected an opening attack action");
  }
  return applyAction(state, action);
}
