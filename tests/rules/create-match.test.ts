import { describe, expect, it } from "vitest";
import { createMatch1v1 } from "../../src/rules/create-match";

describe("createMatch1v1", () => {
  it("deals six cards to each player and exposes one trump card", () => {
    const state = createMatch1v1(12345);
    expect(state.hands.human).toHaveLength(6);
    expect(state.hands.bot).toHaveLength(6);
    expect(state.talon).toHaveLength(24);
    expect(state.trumpCard).toBeDefined();
    expect(state.phase).toBe("attack");
    expect(state.table).toEqual([]);
  });

  it("preserves all 36 cards exactly once across zones", () => {
    const state = createMatch1v1(99);
    const ids = [...state.hands.human, ...state.hands.bot, ...state.talon].map((c) => c.id);
    expect(ids).toHaveLength(36);
    expect(new Set(ids).size).toBe(36);
  });

  it("assigns first attacker to the holder of the lowest trump", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const state = createMatch1v1(seed);
      const trumpSuit = state.trumpCard.suit;
      const lowest = (["human", "bot"] as const)
        .flatMap((id) => state.hands[id].map((card) => ({ id, card })))
        .filter(({ card }) => card.suit === trumpSuit)
        .sort((a, b) => a.card.rank - b.card.rank)[0];
      if (lowest) expect(state.attackerId).toBe(lowest.id);
    }
  });
});
