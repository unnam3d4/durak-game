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

  return {
    ...state,
    phase: "finished",
    finishOrder: [...state.finishOrder],
    boutFinishOrder: [],
    foolId: playerId,
    activePlayerId: playerId,
    turnNumber: state.turnNumber + 1
  };
}
