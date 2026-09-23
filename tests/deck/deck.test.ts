import { describe, expect, it } from "vitest";
import { createDeck36, shuffleDeck } from "../../src/deck/deck";
import { createSeededRandom } from "../../src/deck/random";

describe("36-card deck", () => {
  it("contains exactly 36 unique cards", () => {
    const deck = createDeck36();
    expect(deck).toHaveLength(36);
    expect(new Set(deck.map((card) => card.id)).size).toBe(36);
  });

  it("does not mutate the source deck", () => {
    const deck = createDeck36();
    const sourceIds = deck.map((c) => c.id);
    shuffleDeck(deck, createSeededRandom(123));
    expect(deck.map((c) => c.id)).toEqual(sourceIds);
  });

  it("is reproducible from the same seed", () => {
    const deck = createDeck36();
    const a = shuffleDeck(deck, createSeededRandom(987654));
    const b = shuffleDeck(deck, createSeededRandom(987654));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it("changes order for a different seed", () => {
    const deck = createDeck36();
    const a = shuffleDeck(deck, createSeededRandom(1));
    const b = shuffleDeck(deck, createSeededRandom(2));
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });
});
