import type { Card } from "./cards";

export type PlayerId = "human" | "bot";
export type MatchPhase = "attack" | "defend" | "throw-in" | "finished";

export type TablePair = Readonly<{
  attack: Card;
  defense?: Card;
}>;

export type MatchResult =
  | Readonly<{ kind: "winner"; winner: PlayerId; loser: PlayerId }>
  | Readonly<{ kind: "draw" }>
  | Readonly<{ kind: "technical-loss"; loser: PlayerId; winner: PlayerId }>;

export type GameState = Readonly<{
  schemaVersion: 1;
  seed: number;
  hands: Readonly<Record<PlayerId, readonly Card[]>>;
  talon: readonly Card[];
  trumpCard: Card;
  discard: readonly Card[];
  table: readonly TablePair[];
  attackerId: PlayerId;
  defenderId: PlayerId;
  activePlayerId: PlayerId;
  phase: MatchPhase;
  defenderHandSizeAtBoutStart: number;
  result: MatchResult | null;
  turnNumber: number;
}>;
