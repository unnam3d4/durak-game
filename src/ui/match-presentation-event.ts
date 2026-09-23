import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import type { ParticipantId } from "../core/participants";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";

export type MatchPresentationEvent =
  | Readonly<{
      type: "bout-taken";
      cards: readonly Card[];
      defenderId: ParticipantId;
      turnNumber: number;
    }>
  | Readonly<{
      type: "bout-discarded";
      cards: readonly Card[];
      turnNumber: number;
    }>;

function tableCards(state: MultiplayerGameState): readonly Card[] {
  return state.table.flatMap((pair) => [
    pair.attack,
    ...(pair.defense ? [pair.defense] : [])
  ]);
}

export function derivePresentationEvent(
  before: MultiplayerGameState,
  _action: MultiplayerGameAction,
  after: MultiplayerGameState
): MatchPresentationEvent | null {
  if (before.table.length === 0 || after.table.length !== 0) {
    return null;
  }

  const cards = tableCards(before);
  const previousTakeId = before.lastTakeEvent?.id ?? null;
  const takeEvent = after.lastTakeEvent;

  if (
    takeEvent !== null &&
    takeEvent.id !== previousTakeId &&
    takeEvent.defenderId === before.defenderId
  ) {
    return {
      type: "bout-taken",
      cards,
      defenderId: before.defenderId,
      turnNumber: after.turnNumber
    };
  }

  return {
    type: "bout-discarded",
    cards,
    turnNumber: after.turnNumber
  };
}
