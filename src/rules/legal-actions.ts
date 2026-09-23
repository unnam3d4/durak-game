import type { Card, Suit } from "../core/cards";
import type { GameState, PlayerId } from "../core/game-types";

export type GameAction =
  | { type: "play-attack"; playerId: PlayerId; cardId: string }
  | { type: "play-attack-set"; playerId: PlayerId; cardIds: readonly string[] }
  | { type: "play-defense"; playerId: PlayerId; attackCardId: string; cardId: string }
  | { type: "take"; playerId: PlayerId }
  | { type: "finish-bout"; playerId: PlayerId };

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];

  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index += 1) {
    const head = items[index]!;
    for (const tail of combinations(items.slice(index + 1), size - 1)) {
      result.push([head, ...tail]);
    }
  }
  return result;
}

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
    const singles: GameAction[] = hand.map((card) => ({
      type: "play-attack" as const,
      playerId,
      cardId: card.id
    }));

    const cap = Math.min(6, state.defenderHandSizeAtBoutStart);
    const byRank = new Map<number, Card[]>();
    for (const card of hand) {
      const sameRank = byRank.get(card.rank) ?? [];
      sameRank.push(card);
      byRank.set(card.rank, sameRank);
    }

    const sets: GameAction[] = [];
    for (const cards of byRank.values()) {
      for (let size = 2; size <= Math.min(cards.length, cap); size += 1) {
        for (const group of combinations(cards, size)) {
          sets.push({
            type: "play-attack-set",
            playerId,
            cardIds: group.map((card) => card.id)
          });
        }
      }
    }

    return [...singles, ...sets];
  }

  if (state.phase === "defend") {
    const unbeaten = state.table.filter((pair) => pair.defense === undefined);
    if (unbeaten.length === 0) return [];

    const defenses: GameAction[] = [];
    for (const pair of unbeaten) {
      for (const card of hand) {
        if (!canBeat(pair.attack, card, state.trumpCard.suit)) continue;
        defenses.push({
          type: "play-defense",
          playerId,
          attackCardId: pair.attack.id,
          cardId: card.id
        });
      }
    }

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
    const matchingCards =
      state.table.length >= cap
        ? []
        : hand.filter((card) => visibleRanks.has(card.rank));
    const throwIns: GameAction[] = matchingCards.map((card) => ({
      type: "play-attack" as const,
      playerId,
      cardId: card.id
    }));
    const remainingSlots = Math.max(0, cap - state.table.length);
    const sets: GameAction[] = [];
    for (
      let size = 2;
      size <= Math.min(matchingCards.length, remainingSlots);
      size += 1
    ) {
      for (const group of combinations(matchingCards, size)) {
        sets.push({
          type: "play-attack-set",
          playerId,
          cardIds: group.map((card) => card.id)
        });
      }
    }
    return [...throwIns, ...sets, { type: "finish-bout" as const, playerId }];
  }

  return [];
}
