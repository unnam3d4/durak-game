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
  if (a.type === "play-attack-set" && b.type === "play-attack-set") {
    return (
      a.cardIds.length === b.cardIds.length &&
      [...a.cardIds].sort().every((id, index) => id === [...b.cardIds].sort()[index])
    );
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
    const taking: GameState = {
      ...state,
      hands,
      table: [...state.table, { attack: card }],
      activePlayerId: state.attackerId,
      phase: "taking"
    };
    if (
      state.talon.length === 0 &&
      hands[state.attackerId].length === 0
    ) {
      return resolveTake(taking);
    }
    return taking;
  }
  return {
    ...state,
    hands,
    table: [...state.table, { attack: card }],
    activePlayerId: state.defenderId,
    phase: "defend"
  };
}

function applyAttackSet(
  state: GameState,
  action: Extract<GameAction, { type: "play-attack-set" }>
): GameState {
  const selected = new Set(action.cardIds);
  const cards = state.hands[action.playerId].filter((card) => selected.has(card.id));
  if (cards.length !== action.cardIds.length) {
    throw new Error("Attack set contains a card not in hand");
  }

  const hands: GameState["hands"] = {
    ...state.hands,
    [action.playerId]: state.hands[action.playerId].filter(
      (card) => !selected.has(card.id)
    )
  };
  const appendedTable = [
    ...state.table,
    ...cards.map((attack) => ({ attack }))
  ];

  if (state.phase === "taking") {
    const taking: GameState = {
      ...state,
      hands,
      table: appendedTable,
      activePlayerId: state.attackerId,
      phase: "taking"
    };
    if (
      state.talon.length === 0 &&
      hands[state.attackerId].length === 0
    ) {
      return resolveTake(taking);
    }
    return taking;
  }

  return {
    ...state,
    hands,
    table: state.table.length === 0
      ? cards.map((attack) => ({ attack }))
      : appendedTable,
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

  const hasUnbeatenAttack = table.some((pair) => pair.defense === undefined);
  const defended: GameState = {
    ...state,
    hands,
    table,
    activePlayerId: hasUnbeatenAttack ? state.defenderId : state.attackerId,
    phase: hasUnbeatenAttack ? "defend" : "throw-in"
  };

  if (
    !hasUnbeatenAttack &&
    state.talon.length === 0 &&
    hands[state.attackerId].length === 0
  ) {
    return resolveSuccessfulBout(defended);
  }

  return defended;
}

function beginTake(state: GameState): GameState {
  const taking: GameState = {
    ...state,
    activePlayerId: state.attackerId,
    phase: "taking"
  };

  if (
    state.talon.length === 0 &&
    state.hands[state.attackerId].length === 0
  ) {
    return resolveTake(taking);
  }

  return taking;
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
    case "play-attack-set":
      next = applyAttackSet(state, action);
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
