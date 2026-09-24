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
    }>
  | Readonly<{
      type: "talon-to-seat";
      participantId: ParticipantId;
      count: number;
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

function talonDrawCount(
  before: MultiplayerGameState,
  after: MultiplayerGameState,
  presentation: MatchPresentationEvent | null,
  participantId: ParticipantId
): number {
  if (after.talon.length >= before.talon.length) return 0;

  const handIncrease =
    after.hands[participantId].length -
    before.hands[participantId].length;
  const collectedFromTable =
    presentation?.type === "bout-taken" &&
    presentation.defenderId === participantId
      ? presentation.cards.length
      : 0;

  return Math.max(0, handIncrease - collectedFromTable);
}

export function deriveCardTransitIntents(
  before: MultiplayerGameState,
  action: MultiplayerGameAction,
  after: MultiplayerGameState,
  presentation: MatchPresentationEvent | null
): readonly CardTransitIntent[] {
  const intents: CardTransitIntent[] = [];

  if (presentation?.type === "bout-taken") {
    intents.push({
      type: "table-to-hand",
      participantId: presentation.defenderId,
      cardIds: presentation.cards.map((card) => card.id)
    });
  } else if (presentation?.type === "bout-discarded") {
    intents.push({
      type: "table-to-discard",
      cardIds: presentation.cards.map((card) => card.id)
    });
  } else if (action.playerId !== "human") {
    const cardIds = playedCardIds(action);
    if (cardIds.length > 0) {
      intents.push({
        type: "opponent-to-table",
        participantId: action.playerId,
        cardIds
      });
    }
  }

  for (const participantId of before.participants) {
    const count = talonDrawCount(
      before,
      after,
      presentation,
      participantId
    );
    if (count > 0) {
      intents.push({
        type: "talon-to-seat",
        participantId,
        count
      });
    }
  }

  return intents;
}
