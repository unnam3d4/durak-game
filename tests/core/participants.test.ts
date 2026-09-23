import { describe, expect, it } from "vitest";
import {
  attackersForBout,
  nextAttackerAfterSuccessfulDefense,
  nextAttackerAfterTake,
  nextEligibleParticipant,
  participantOrder,
  refillOrderForBout
} from "../../src/core/participants";

describe("multiplayer participant order", () => {
  it("builds stable seating for two, three, and four participants", () => {
    expect(participantOrder(2)).toEqual(["human", "bot"]);
    expect(participantOrder(3)).toEqual(["human", "bot", "bot2"]);
    expect(participantOrder(4)).toEqual(["human", "bot", "bot2", "bot3"]);
  });

  it("walks clockwise and skips ineligible participants", () => {
    const order = participantOrder(4);
    const eligible = new Set(["human", "bot2"] as const);

    expect(nextEligibleParticipant(order, "human", eligible)).toBe("bot2");
    expect(nextEligibleParticipant(order, "bot2", eligible)).toBe("human");
  });

  it("lists every attacker except the defender in clockwise order", () => {
    const order = participantOrder(4);

    expect(attackersForBout(order, "human", "bot")).toEqual([
      "human",
      "bot2",
      "bot3"
    ]);
    expect(attackersForBout(order, "bot2", "bot3")).toEqual([
      "bot2",
      "human",
      "bot"
    ]);
  });

  it("removes finished participants from the attacker rotation", () => {
    const order = participantOrder(4);
    const eligible = new Set(["human", "bot", "bot3"] as const);

    expect(attackersForBout(order, "human", "bot", eligible)).toEqual([
      "human",
      "bot3"
    ]);
  });

  it("refills attackers first and the defender last", () => {
    const order = participantOrder(4);

    expect(refillOrderForBout(order, "human", "bot")).toEqual([
      "human",
      "bot2",
      "bot3",
      "bot"
    ]);
  });

  it("makes a successful defender the next attacker", () => {
    expect(nextAttackerAfterSuccessfulDefense("bot2")).toBe("bot2");
  });

  it("skips a defender who took and advances clockwise", () => {
    const order = participantOrder(4);

    expect(nextAttackerAfterTake(order, "bot")).toBe("bot2");

    const eligible = new Set(["human", "bot", "bot3"] as const);
    expect(nextAttackerAfterTake(order, "bot", eligible)).toBe("bot3");
  });

  it("preserves the current two-player behavior after a take", () => {
    const order = participantOrder(2);
    expect(nextAttackerAfterTake(order, "bot")).toBe("human");
    expect(nextAttackerAfterTake(order, "human")).toBe("bot");
  });
});
