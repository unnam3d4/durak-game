import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import type { ParticipantId } from "../core/participants";

export function applyTechnicalLoss(
  state: MultiplayerGameState,
  playerId: ParticipantId
): MultiplayerGameState {
  if (state.phase === "finished") return state;
  if (!state.participants.includes(playerId)) {
    throw new Error("Technical loss player is not in the match");
  }

  const finishOrder = state.finishOrder.filter(
    (participantId) => participantId !== playerId
  );
  for (const participantId of state.participants) {
    if (
      participantId !== playerId &&
      !finishOrder.includes(participantId)
    ) {
      finishOrder.push(participantId);
    }
  }

  return {
    ...state,
    phase: "finished",
    finishOrder,
    boutFinishOrder: [],
    foolId: playerId,
    activePlayerId: playerId,
    turnNumber: state.turnNumber + 1
  };
}
