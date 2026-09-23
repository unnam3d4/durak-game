import type { Card } from "./cards";
import type { MatchPhase, TablePair } from "./game-types";
import type { ParticipantId } from "./participants";

export type ParticipantHands = Readonly<Record<ParticipantId, readonly Card[]>>;

export type MultiplayerGameState = Readonly<{
  schemaVersion: 2;
  seed: number;
  participants: readonly ParticipantId[];
  hands: ParticipantHands;
  talon: readonly Card[];
  trumpCard: Card;
  discard: readonly Card[];
  table: readonly TablePair[];
  attackerId: ParticipantId;
  defenderId: ParticipantId;
  activePlayerId: ParticipantId;
  phase: MatchPhase;
  defenderHandSizeAtBoutStart: number;
  finishOrder: readonly ParticipantId[];
  turnNumber: number;
}>;
