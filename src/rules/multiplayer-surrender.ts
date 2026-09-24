import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import {
  nextEligibleParticipant,
  type ParticipantId
} from "../core/participants";
import {
  activeCompetitiveParticipants,
  finishIfOneRemains
} from "./multiplayer-resolution";

export function applyParticipantSurrender(
  state: MultiplayerGameState,
  participantId: ParticipantId
): MultiplayerGameState {
  if (!state.participants.includes(participantId)) {
    throw new Error("Inactive participant cannot surrender");
  }
  if (
    state.phase === "finished" ||
    state.finishOrder.includes(participantId) ||
    state.forfeitOrder.includes(participantId)
  ) {
    return state;
  }
  if (state.phase !== "attack" || state.table.length !== 0) {
    throw new Error("Participant surrender requires a clean bout start");
  }

  const surrenderedCards = state.hands[participantId];
  const surrendered: MultiplayerGameState = {
    ...state,
    hands: {
      ...state.hands,
      [participantId]: []
    },
    forfeitPile: [...state.forfeitPile, ...surrenderedCards],
    forfeitOrder: [...state.forfeitOrder, participantId],
    boutFinishOrder: state.boutFinishOrder.filter(
      (id) => id !== participantId
    ),
    throwInCursor: 0,
    consecutivePasses: 0
  };

  const finished = finishIfOneRemains(surrendered);
  if (finished.phase === "finished") return finished;

  const eligible = new Set(activeCompetitiveParticipants(finished));
  const attackerId = eligible.has(finished.attackerId)
    ? finished.attackerId
    : nextEligibleParticipant(
        finished.participants,
        participantId,
        eligible
      );
  if (!attackerId) return finishIfOneRemains(finished);

  const defenderId =
    eligible.has(finished.defenderId) &&
    finished.defenderId !== attackerId
      ? finished.defenderId
      : nextEligibleParticipant(
          finished.participants,
          attackerId,
          eligible
        );
  if (!defenderId || defenderId === attackerId) {
    return finishIfOneRemains(finished);
  }

  return {
    ...finished,
    attackerId,
    defenderId,
    activePlayerId: attackerId,
    phase: "attack",
    defenderHandSizeAtBoutStart: finished.hands[defenderId].length,
    foolId: null,
    throwInCursor: 0,
    consecutivePasses: 0
  };
}
