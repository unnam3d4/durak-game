import { RANKS, SUITS, type Card } from "../core/cards";
import type { RandomSource } from "./random";

export function createDeck36(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({ id: `${suit}-${rank}`, suit, rank }))
  );
}

export function shuffleDeck(deck: readonly Card[], random: RandomSource): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
