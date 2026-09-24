import type { Card } from "./cards";
import type { MatchPhase, TablePair } from "./game-types";
import type { ParticipantId } from "./participants";

export type ParticipantHands = Readonly<Record<ParticipantId, readonly Card[]>>;

export type MultiplayerVariant = "podkidnoy" | "perevodnoy";

export type MultiplayerTakeEvent = Readonly<{
  id: number;
  defenderId: ParticipantId;
  cards: readonly Card[];
  triggerAttack: Card;
}>;

export type MultiplayerGameState = Readonly<{
  schemaVersion: 3;
  seed: number;
  variant: MultiplayerVariant;
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
  boutFinishOrder: readonly ParticipantId[];
  forfeitPile: readonly Card[];
  forfeitOrder: readonly ParticipantId[];
  lastTakeEvent: MultiplayerTakeEvent | null;
  foolId: ParticipantId | null;
  throwInCursor: number;
  consecutivePasses: number;
  turnNumber: number;
}>;
