import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import {
  attackersForBout,
  type ParticipantId
} from "../core/participants";
import type { TablePair } from "../core/game-types";
import {
  getMultiplayerLegalActions,
  type MultiplayerGameAction
} from "./multiplayer-legal-actions";
import {
  resolveMultiplayerSuccessfulBout,
  resolveMultiplayerTake
} from "./multiplayer-resolution";

function sameAction(
  a: MultiplayerGameAction,
  b: MultiplayerGameAction
): boolean {
  if (a.type !== b.type || a.playerId !== b.playerId) return false;

  if (a.type === "play-attack" && b.type === "play-attack") {
    return a.cardId === b.cardId;
  }
  if (a.type === "play-defense" && b.type === "play-defense") {
    return (
      a.attackCardId === b.attackCardId &&
      a.cardId === b.cardId
    );
  }
  if (a.type === "play-attack-set" && b.type === "play-attack-set") {
    const left = [...a.cardIds].sort();
    const right = [...b.cardIds].sort();
    return (
      left.length === right.length &&
      left.every((id, index) => id === right[index])
    );
  }

  return true;
}

function removeCards(
  state: MultiplayerGameState,
  playerId: ParticipantId,
  cardIds: readonly string[]
): {
  state: MultiplayerGameState;
  cards: readonly Card[];
} {
  const selected = new Set(cardIds);
  const cards = state.hands[playerId].filter((card) => selected.has(card.id));
  if (cards.length !== selected.size) {
    throw new Error("Action contains a card not in hand");
  }

  return {
    cards,
    state: {
      ...state,
      hands: {
        ...state.hands,
        [playerId]: state.hands[playerId].filter(
          (card) => !selected.has(card.id)
        )
      }
    }
  };
}

function boutAttackers(
  state: MultiplayerGameState
): readonly ParticipantId[] {
  const finished = new Set(state.finishOrder);
  const eligible = new Set(
    state.participants.filter((participantId) => !finished.has(participantId))
  );
  return attackersForBout(
    state.participants,
    state.attackerId,
    state.defenderId,
    eligible
  );
}

function nextThrower(
  state: MultiplayerGameState,
  cursor: number
): ParticipantId {
  const attackers = boutAttackers(state);
  if (attackers.length === 0) {
    throw new Error("Bout has no eligible attackers");
  }
  return attackers[cursor % attackers.length]!;
}

function advanceCursor(state: MultiplayerGameState): number {
  const attackers = boutAttackers(state);
  if (attackers.length === 0) {
    throw new Error("Bout has no eligible attackers");
  }
  return (state.throwInCursor + 1) % attackers.length;
}

function applyAttackCards(
  state: MultiplayerGameState,
  action: Extract<
    MultiplayerGameAction,
    { type: "play-attack" | "play-attack-set" }
  >
): MultiplayerGameState {
  const cardIds =
    action.type === "play-attack" ? [action.cardId] : action.cardIds;
  const removed = removeCards(state, action.playerId, cardIds);
  const table = [
    ...removed.state.table,
    ...removed.cards.map((attack) => ({ attack }))
  ];

  if (state.phase === "attack") {
    return {
      ...removed.state,
      table,
      activePlayerId: state.defenderId,
      phase: "defend",
      throwInCursor: 0,
      consecutivePasses: 0
    };
  }

  const cursor = advanceCursor(state);
  const attackCap = Math.min(6, state.defenderHandSizeAtBoutStart);

  if (state.phase === "taking") {
    const taking: MultiplayerGameState = {
      ...removed.state,
      table,
      phase: "taking",
      activePlayerId: nextThrower(state, cursor),
      throwInCursor: cursor,
      consecutivePasses: 0
    };
    return table.length >= attackCap
      ? resolveMultiplayerTake(taking)
      : taking;
  }

  return {
    ...removed.state,
    table,
    activePlayerId: state.defenderId,
    phase: "defend",
    throwInCursor: cursor,
    consecutivePasses: 0
  };
}

function applyDefense(
  state: MultiplayerGameState,
  action: Extract<MultiplayerGameAction, { type: "play-defense" }>
): MultiplayerGameState {
  const removed = removeCards(state, action.playerId, [action.cardId]);
  const defense = removed.cards[0]!;
  let matched = false;
  const table: TablePair[] = removed.state.table.map((pair) => {
    if (pair.attack.id !== action.attackCardId) return pair;
    if (pair.defense) throw new Error("Attack is already defended");
    matched = true;
    return { ...pair, defense };
  });
  if (!matched) {
    throw new Error(`Attack card not found: ${action.attackCardId}`);
  }

  const hasUnbeaten = table.some((pair) => pair.defense === undefined);
  if (hasUnbeaten) {
    return {
      ...removed.state,
      table,
      activePlayerId: state.defenderId,
      phase: "defend"
    };
  }

  const defended: MultiplayerGameState = {
    ...removed.state,
    table,
    phase: "throw-in",
    activePlayerId: nextThrower(state, state.throwInCursor)
  };
  const attackCap = Math.min(6, state.defenderHandSizeAtBoutStart);
  return table.length >= attackCap
    ? resolveMultiplayerSuccessfulBout(defended)
    : defended;
}

function beginTake(state: MultiplayerGameState): MultiplayerGameState {
  return {
    ...state,
    phase: "taking",
    activePlayerId: nextThrower(state, state.throwInCursor),
    consecutivePasses: 0
  };
}

function applyPass(state: MultiplayerGameState): MultiplayerGameState {
  const attackers = boutAttackers(state);
  if (attackers.length === 0) {
    throw new Error("Bout has no eligible attackers");
  }

  const consecutivePasses = state.consecutivePasses + 1;
  if (consecutivePasses >= attackers.length) {
    return state.phase === "taking"
      ? resolveMultiplayerTake(state)
      : resolveMultiplayerSuccessfulBout(state);
  }

  const cursor = (state.throwInCursor + 1) % attackers.length;
  return {
    ...state,
    activePlayerId: attackers[cursor]!,
    throwInCursor: cursor,
    consecutivePasses
  };
}

export function applyMultiplayerAction(
  state: MultiplayerGameState,
  action: MultiplayerGameAction
): MultiplayerGameState {
  const legal = getMultiplayerLegalActions(state, action.playerId);
  if (!legal.some((candidate) => sameAction(candidate, action))) {
    throw new Error("Illegal multiplayer action");
  }

  let next: MultiplayerGameState;
  switch (action.type) {
    case "play-attack":
    case "play-attack-set":
      next = applyAttackCards(state, action);
      break;
    case "play-defense":
      next = applyDefense(state, action);
      break;
    case "take":
      next = beginTake(state);
      break;
    case "pass-throw-in":
      next = applyPass(state);
      break;
  }

  return {
    ...next,
    turnNumber: state.turnNumber + 1
  };
}
