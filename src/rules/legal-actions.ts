import type { Card, Suit } from "../core/cards";
import type { GameState, PlayerId } from "../core/game-types";

export type GameAction =
  | { type: "play-attack"; playerId: PlayerId; cardId: string }
  | { type: "play-defense"; playerId: PlayerId; attackCardId: string; cardId: string }
  | { type: "take"; playerId: PlayerId }
  | { type: "finish-bout"; playerId: PlayerId };

export function canBeat(attack: Card, defense: Card, trumpSuit: Suit): boolean {
  if (attack.suit === trumpSuit) {
    return defense.suit === trumpSuit && defense.rank > attack.rank;
  }
  if (defense.suit === trumpSuit) return true;
  return defense.suit === attack.suit && defense.rank > attack.rank;
}

export function getLegalActions(
  state: GameState,
  playerId: PlayerId
): readonly GameAction[] {
  if (state.phase === "finished" || state.activePlayerId !== playerId) return [];

  const hand = state.hands[playerId];

  if (state.phase === "attack" && state.table.length === 0) {
    return hand.map((card) => ({
      type: "play-attack" as const,
      playerId,
      cardId: card.id
    }));
  }

  if (state.phase === "defend") {
    const unbeaten = state.table.find((pair) => pair.defense === undefined);
    if (!unbeaten) return [];
    const defenses = hand
      .filter((card) => canBeat(unbeaten.attack, card, state.trumpCard.suit))
      .map((card) => ({
        type: "play-defense" as const,
        playerId,
        attackCardId: unbeaten.attack.id,
        cardId: card.id
      }));
    return [...defenses, { type: "take" as const, playerId }];
  }

  if (state.phase === "throw-in" || state.phase === "taking") {
    const cap = Math.min(6, state.defenderHandSizeAtBoutStart);
    const visibleRanks = new Set(
      state.table.flatMap((pair) => [
        pair.attack.rank,
        ...(pair.defense ? [pair.defense.rank] : [])
      ])
    );
    const throwIns =
      state.table.length >= cap
        ? []
        : hand
            .filter((card) => visibleRanks.has(card.rank))
            .map((card) => ({
              type: "play-attack" as const,
              playerId,
              cardId: card.id
            }));
    return [...throwIns, { type: "finish-bout" as const, playerId }];
  }

  return [];
}
