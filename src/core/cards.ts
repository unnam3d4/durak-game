export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export type Card = Readonly<{
  id: string;
  suit: Suit;
  rank: Rank;
}>;

export function compareSameSuit(a: Card, b: Card): number {
  if (a.suit !== b.suit) throw new Error("Cards must have the same suit");
  return a.rank - b.rank;
}
