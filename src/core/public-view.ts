import type { Card } from "./cards";
import type { MatchPhase, PlayerId, TablePair } from "./game-types";
import type { GameAction } from "../rules/legal-actions";
import { getLegalActions } from "../rules/legal-actions";
import type { GameState } from "./game-types";

export type PublicGameView = Readonly<{
  viewerId: PlayerId;
  ownHand: readonly Card[];
  opponentCardCounts: Readonly<Record<PlayerId, number>>;
  talonCount: number;
  trumpCard: Card;
  discardCount: number;
  discard: readonly Card[];
  table: readonly TablePair[];
  attackerId: PlayerId;
  defenderId: PlayerId;
  activePlayerId: PlayerId;
  phase: MatchPhase;
  legalActions: readonly GameAction[];
  turnNumber: number;
}>;

export function toPlayerView(
  state: GameState,
  viewerId: PlayerId
): PublicGameView {
  return {
    viewerId,
    ownHand: [...state.hands[viewerId]],
    opponentCardCounts: {
      human: state.hands.human.length,
      bot: state.hands.bot.length
    },
    talonCount: state.talon.length,
    trumpCard: state.trumpCard,
    discardCount: state.discard.length,
    discard: [...state.discard],
    table: state.table,
    attackerId: state.attackerId,
    defenderId: state.defenderId,
    activePlayerId: state.activePlayerId,
    phase: state.phase,
    legalActions: getLegalActions(state, viewerId),
    turnNumber: state.turnNumber
  };
}
