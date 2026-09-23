import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";
import { getMultiplayerLegalActions } from "../rules/multiplayer-legal-actions";

function openingCardScore(
  card: Card,
  trumpSuit: Card["suit"]
): number {
  const trumpPenalty = card.suit === trumpSuit ? 100 : 0;
  return trumpPenalty + card.rank;
}

export function chooseMultiplayerTimeoutAction(
  state: MultiplayerGameState
): MultiplayerGameAction | null {
  if (state.phase === "finished") return null;

  const playerId = state.activePlayerId;
  const actions = [...getMultiplayerLegalActions(state, playerId)];
  if (actions.length === 0) return null;

  if (state.phase === "defend") {
    return actions.find((action) => action.type === "take") ?? null;
  }

  if (state.phase === "throw-in" || state.phase === "taking") {
    return (
      actions.find((action) => action.type === "pass-throw-in") ??
      null
    );
  }

  const singles = actions
    .filter(
      (
        action
      ): action is Extract<
        MultiplayerGameAction,
        { type: "play-attack" }
      > => action.type === "play-attack"
    )
    .sort((a, b) => {
      const cardA = state.hands[playerId].find(
        (card) => card.id === a.cardId
      );
      const cardB = state.hands[playerId].find(
        (card) => card.id === b.cardId
      );
      if (!cardA || !cardB) return 0;
      return (
        openingCardScore(cardA, state.trumpCard.suit) -
        openingCardScore(cardB, state.trumpCard.suit)
      );
    });

  return singles[0] ?? actions[0] ?? null;
}
