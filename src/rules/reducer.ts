import type { Card } from "../core/cards";
import type { GameState, PlayerId, TablePair } from "../core/game-types";
import { getLegalActions, type GameAction } from "./legal-actions";
import { resolveSuccessfulBout, resolveTake } from "./resolution";

function sameAction(a: GameAction, b: GameAction): boolean {
  if (a.type !== b.type || a.playerId !== b.playerId) return false;
  if (a.type === "play-attack" && b.type === "play-attack") {
    return a.cardId === b.cardId;
  }
  if (a.type === "play-defense" && b.type === "play-defense") {
    return a.attackCardId === b.attackCardId && a.cardId === b.cardId;
  }
  return a.type === b.type;
}

function removeCard(
  hands: GameState["hands"],
  playerId: PlayerId,
  cardId: string
): { hands: GameState["hands"]; card: Card } {
  const source = hands[playerId];
  const card = source.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Card not found: ${cardId}`);

  return {
    card,
    hands: {
      ...hands,
      [playerId]: source.filter((candidate) => candidate.id !== cardId)
    }
  };
}

function applyAttack(
  state: GameState,
  action: Extract<GameAction, { type: "play-attack" }>
): GameState {
  const { hands, card } = removeCard(state.hands, action.playerId, action.cardId);
  if (state.phase === "taking") {
    return {
      ...state,
      hands,
      table: [...state.table, { attack: card }],
      activePlayerId: state.attackerId,
      phase: "taking"
    };
  }
  return {
    ...state,
    hands,
    table: [...state.table, { attack: card }],
    activePlayerId: state.defenderId,
    phase: "defend"
  };
}

function applyDefense(
  state: GameState,
  action: Extract<GameAction, { type: "play-defense" }>
): GameState {
  const { hands, card } = removeCard(state.hands, action.playerId, action.cardId);
  let matched = false;
  const table: TablePair[] = state.table.map((pair) => {
    if (pair.attack.id !== action.attackCardId) return pair;
    matched = true;
    return { ...pair, defense: card };
  });
  if (!matched) throw new Error(`Attack card not found: ${action.attackCardId}`);

  return {
    ...state,
    hands,
    table,
    activePlayerId: state.attackerId,
    phase: "throw-in"
  };
}

function beginTake(state: GameState): GameState {
  return {
    ...state,
    activePlayerId: state.attackerId,
    phase: "taking"
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  const legal = getLegalActions(state, action.playerId);
  if (!legal.some((candidate) => sameAction(candidate, action))) {
    throw new Error("Illegal action");
  }

  let next: GameState;
  switch (action.type) {
    case "play-attack":
      next = applyAttack(state, action);
      break;
    case "play-defense":
      next = applyDefense(state, action);
      break;
    case "take":
      next = beginTake(state);
      break;
    case "finish-bout":
      next = state.phase === "taking" ? resolveTake(state) : resolveSuccessfulBout(state);
      break;
  }

  return { ...next, turnNumber: state.turnNumber + 1 };
}

export function applyTimeoutLoss(state: GameState, playerId: PlayerId): GameState {
  if (state.phase === "finished") return state;
  const winner: PlayerId = playerId === "human" ? "bot" : "human";
  return {
    ...state,
    phase: "finished",
    result: { kind: "technical-loss", loser: playerId, winner }
  };
}
