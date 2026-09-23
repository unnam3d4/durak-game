import type { Card } from "../core/cards";
import type {
  MultiplayerGameState,
  ParticipantHands
} from "../core/multiplayer-game-types";
import {
  nextAttackerAfterTake,
  nextEligibleParticipant,
  refillOrderForBout,
  type ParticipantId
} from "../core/participants";

function tableCards(state: MultiplayerGameState): Card[] {
  return state.table.flatMap((pair) => [
    pair.attack,
    ...(pair.defense ? [pair.defense] : [])
  ]);
}

export function activeCompetitiveParticipants(
  state: MultiplayerGameState
): readonly ParticipantId[] {
  const unavailable = new Set([
    ...state.finishOrder,
    ...state.forfeitOrder
  ]);
  return state.participants.filter(
    (participantId) => !unavailable.has(participantId)
  );
}

export function refillMultiplayerHands(
  state: MultiplayerGameState
): MultiplayerGameState {
  const mutableHands: Record<ParticipantId, Card[]> = {
    human: [...state.hands.human],
    bot: [...state.hands.bot],
    bot2: [...state.hands.bot2],
    bot3: [...state.hands.bot3]
  };
  const talon = [...state.talon];
  const eligible = new Set(activeCompetitiveParticipants(state));
  const drawOrder = refillOrderForBout(
    state.participants,
    state.attackerId,
    state.defenderId,
    eligible
  );

  for (const participantId of drawOrder) {
    while (mutableHands[participantId].length < 6 && talon.length > 0) {
      mutableHands[participantId].push(talon.shift()!);
    }
  }

  const hands: ParticipantHands = mutableHands;
  return { ...state, hands, talon };
}

function recordFinishers(state: MultiplayerGameState): MultiplayerGameState {
  if (state.talon.length > 0) {
    return {
      ...state,
      boutFinishOrder: []
    };
  }

  const unavailable = new Set([
    ...state.finishOrder,
    ...state.forfeitOrder
  ]);
  const orderedCandidates = state.boutFinishOrder.filter(
    (participantId) =>
      !unavailable.has(participantId) &&
      state.hands[participantId].length === 0
  );
  const orderedCandidateSet = new Set(orderedCandidates);
  const remainingEmpty = state.participants.filter(
    (participantId) =>
      !unavailable.has(participantId) &&
      !orderedCandidateSet.has(participantId) &&
      state.hands[participantId].length === 0
  );
  const newlyFinished = [...orderedCandidates, ...remainingEmpty];

  return {
    ...state,
    finishOrder: [...state.finishOrder, ...newlyFinished],
    boutFinishOrder: []
  };
}

export function finishIfOneRemains(
  state: MultiplayerGameState
): MultiplayerGameState {
  const remaining = activeCompetitiveParticipants(state);
  if (remaining.length > 1) return state;

  if (state.forfeitOrder.length > 0) {
    const firstForfeit = state.forfeitOrder[0]!;
    const finishOrder = [...state.finishOrder];
    const lastHonest = remaining[0];
    if (lastHonest && !finishOrder.includes(lastHonest)) {
      finishOrder.push(lastHonest);
    }
    for (const participantId of [...state.forfeitOrder.slice(1)].reverse()) {
      if (!finishOrder.includes(participantId)) {
        finishOrder.push(participantId);
      }
    }

    return {
      ...state,
      finishOrder,
      phase: "finished",
      foolId: firstForfeit,
      activePlayerId: lastHonest ?? firstForfeit,
      table: [],
      throwInCursor: 0,
      consecutivePasses: 0
    };
  }

  return {
    ...state,
    phase: "finished",
    foolId: remaining[0] ?? null,
    activePlayerId: remaining[0] ?? state.activePlayerId,
    table: [],
    throwInCursor: 0,
    consecutivePasses: 0
  };
}

function prepareNextBout(
  state: MultiplayerGameState,
  outcome: "defended" | "taken",
  oldDefenderId: ParticipantId
): MultiplayerGameState {
  const scored = finishIfOneRemains(recordFinishers(state));
  if (scored.phase === "finished") return scored;

  const eligible = new Set(activeCompetitiveParticipants(scored));
  let nextAttacker: ParticipantId | undefined;

  if (outcome === "defended" && eligible.has(oldDefenderId)) {
    nextAttacker = oldDefenderId;
  } else {
    nextAttacker = nextAttackerAfterTake(
      scored.participants,
      oldDefenderId,
      eligible
    );
  }

  if (!nextAttacker) {
    return {
      ...scored,
      phase: "finished",
      foolId: null
    };
  }

  const nextDefender = nextEligibleParticipant(
    scored.participants,
    nextAttacker,
    eligible
  );
  if (!nextDefender || nextDefender === nextAttacker) {
    return {
      ...scored,
      phase: "finished",
      foolId: nextAttacker
    };
  }

  return {
    ...scored,
    attackerId: nextAttacker,
    defenderId: nextDefender,
    activePlayerId: nextAttacker,
    phase: "attack",
    defenderHandSizeAtBoutStart: scored.hands[nextDefender].length,
    foolId: null,
    throwInCursor: 0,
    consecutivePasses: 0
  };
}

export function resolveMultiplayerSuccessfulBout(
  state: MultiplayerGameState
): MultiplayerGameState {
  const oldDefenderId = state.defenderId;
  const cleared: MultiplayerGameState = {
    ...state,
    discard: [...state.discard, ...tableCards(state)],
    table: []
  };

  const refilled = refillMultiplayerHands(cleared);
  return prepareNextBout(refilled, "defended", oldDefenderId);
}

export function resolveMultiplayerTake(
  state: MultiplayerGameState
): MultiplayerGameState {
  const oldDefenderId = state.defenderId;
  const collected = tableCards(state);
  const triggerAttack =
    state.table.find((pair) => pair.defense === undefined)?.attack ??
    state.table[0]?.attack;
  const hands: ParticipantHands = {
    ...state.hands,
    [oldDefenderId]: [...state.hands[oldDefenderId], ...collected]
  };
  const cleared: MultiplayerGameState = {
    ...state,
    hands,
    table: [],
    lastTakeEvent: triggerAttack
      ? {
          id: state.turnNumber + 1,
          defenderId: oldDefenderId,
          cards: collected,
          triggerAttack
        }
      : state.lastTakeEvent
  };

  const refilled = refillMultiplayerHands(cleared);
  return prepareNextBout(refilled, "taken", oldDefenderId);
}
