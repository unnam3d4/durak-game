import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import type { ParticipantId } from "../core/participants";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";
import type { MatchPresentationEvent } from "./match-presentation-event";

export type CardTransitIntent =
  | Readonly<{
      type: "opponent-to-table";
      participantId: Exclude<ParticipantId, "human">;
      cardIds: readonly string[];
    }>
  | Readonly<{
      type: "table-to-hand";
      participantId: ParticipantId;
      cardIds: readonly string[];
    }>
  | Readonly<{
      type: "table-to-discard";
      cardIds: readonly string[];
    }>;

function playedCardIds(
  action: MultiplayerGameAction
): readonly string[] {
  switch (action.type) {
    case "play-attack":
    case "play-defense":
      return [action.cardId];
    case "play-attack-set":
    case "transfer":
      return action.cardIds;
    case "take":
    case "pass-throw-in":
      return [];
  }
}

export function deriveCardTransitIntents(
  _before: MultiplayerGameState,
  action: MultiplayerGameAction,
  _after: MultiplayerGameState,
  presentation: MatchPresentationEvent | null
): readonly CardTransitIntent[] {
  if (presentation?.type === "bout-taken") {
    return [
      {
        type: "table-to-hand",
        participantId: presentation.defenderId,
        cardIds: presentation.cards.map((card) => card.id)
      }
    ];
  }

  if (presentation?.type === "bout-discarded") {
    return [
      {
        type: "table-to-discard",
        cardIds: presentation.cards.map((card) => card.id)
      }
    ];
  }

  if (action.playerId !== "human") {
    const cardIds = playedCardIds(action);
    if (cardIds.length > 0) {
      return [
        {
          type: "opponent-to-table",
          participantId: action.playerId,
          cardIds
        }
      ];
    }
  }

  return [];
}
