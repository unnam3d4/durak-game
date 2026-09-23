import type { Card } from "./cards";
import type { MatchPhase, TablePair } from "./game-types";
import type {
  MultiplayerGameState,
  MultiplayerTakeEvent,
  MultiplayerVariant
} from "./multiplayer-game-types";
import type { ParticipantId } from "./participants";
import {
  getMultiplayerLegalActions,
  type MultiplayerGameAction
} from "../rules/multiplayer-legal-actions";

export type MultiplayerPublicView = Readonly<{
  viewerId: ParticipantId;
  variant: MultiplayerVariant;
  participants: readonly ParticipantId[];
  ownHand: readonly Card[];
  cardCounts: Readonly<Record<ParticipantId, number>>;
  talonCount: number;
  trumpCard: Card;
  discard: readonly Card[];
  table: readonly TablePair[];
  attackerId: ParticipantId;
  defenderId: ParticipantId;
  activePlayerId: ParticipantId;
  phase: MatchPhase;
  defenderHandSizeAtBoutStart: number;
  finishOrder: readonly ParticipantId[];
  lastTakeEvent: MultiplayerTakeEvent | null;
  foolId: ParticipantId | null;
  turnNumber: number;
  legalActions: readonly MultiplayerGameAction[];
}>;

export function toMultiplayerPlayerView(
  state: MultiplayerGameState,
  viewerId: ParticipantId
): MultiplayerPublicView {
  if (!state.participants.includes(viewerId)) {
    throw new Error(`Inactive participant: ${viewerId}`);
  }

  return {
    viewerId,
    variant: state.variant,
    participants: [...state.participants],
    ownHand: [...state.hands[viewerId]],
    cardCounts: {
      human: state.hands.human.length,
      bot: state.hands.bot.length,
      bot2: state.hands.bot2.length,
      bot3: state.hands.bot3.length
    },
    talonCount: state.talon.length,
    trumpCard: state.trumpCard,
    discard: [...state.discard],
    table: state.table,
    attackerId: state.attackerId,
    defenderId: state.defenderId,
    activePlayerId: state.activePlayerId,
    phase: state.phase,
    defenderHandSizeAtBoutStart: state.defenderHandSizeAtBoutStart,
    finishOrder: [...state.finishOrder],
    lastTakeEvent: state.lastTakeEvent
      ? {
          ...state.lastTakeEvent,
          cards: [...state.lastTakeEvent.cards]
        }
      : null,
    foolId: state.foolId,
    turnNumber: state.turnNumber,
    legalActions: getMultiplayerLegalActions(state, viewerId)
  };
}
