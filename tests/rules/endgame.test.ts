import { describe, expect, it } from "vitest";
import { resolveMatchResult } from "../../src/rules/resolution";
import { card, makeState } from "../support/match-fixtures";

describe("endgame", () => {
  it("declares the player with cards the loser after talon is empty", () => {
    const next = resolveMatchResult(makeState({
      hands: { human: [], bot: [card("clubs", 6)] },
      talon: [],
      table: [],
      result: null
    }));
    expect(next.result).toEqual({ kind: "winner", winner: "human", loser: "bot" });
    expect(next.phase).toBe("finished");
  });

  it("declares a draw when both hands become empty after the same resolved bout", () => {
    const next = resolveMatchResult(makeState({
      hands: { human: [], bot: [] },
      talon: [],
      table: [],
      result: null
    }));
    expect(next.result).toEqual({ kind: "draw" });
    expect(next.phase).toBe("finished");
  });

  it("does not finish while cards remain in the talon", () => {
    const next = resolveMatchResult(makeState({
      hands: { human: [], bot: [card("clubs", 6)] },
      talon: [card("diamonds", 14)],
      result: null
    }));
    expect(next.result).toBeNull();
    expect(next.phase).not.toBe("finished");
  });
});
