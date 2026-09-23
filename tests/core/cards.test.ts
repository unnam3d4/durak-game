import { describe, expect, it } from "vitest";
import { RANKS, SUITS, compareSameSuit, type Card } from "../../src/core/cards";

describe("card primitives", () => {
  it("defines the 36-card rank/suit domain", () => {
    expect(SUITS).toEqual(["clubs", "diamonds", "hearts", "spades"]);
    expect(RANKS).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(SUITS.length * RANKS.length).toBe(36);
  });

  it("compares cards of the same suit by rank", () => {
    const six: Card = { id: "clubs-6", suit: "clubs", rank: 6 };
    const ace: Card = { id: "clubs-14", suit: "clubs", rank: 14 };
    expect(compareSameSuit(ace, six)).toBeGreaterThan(0);
  });

  it("rejects cross-suit comparison", () => {
    const clubs: Card = { id: "clubs-6", suit: "clubs", rank: 6 };
    const hearts: Card = { id: "hearts-6", suit: "hearts", rank: 6 };
    expect(() => compareSameSuit(clubs, hearts)).toThrow("same suit");
  });
});
