import { describe, expect, it } from "vitest";
import { applyTimeoutLoss } from "../../src/rules/reducer";
import { makeState } from "../support/match-fixtures";

describe("timeout result", () => {
  it("marks a human timeout as a technical loss", () => {
    const state = makeState({ phase: "defend", activePlayerId: "human" });
    const next = applyTimeoutLoss(state, "human");
    expect(next.phase).toBe("finished");
    expect(next.result).toEqual({
      kind: "technical-loss",
      loser: "human",
      winner: "bot"
    });
  });

  it("does not rewrite an already-finished result", () => {
    const state = makeState({
      phase: "finished",
      result: { kind: "winner", winner: "human", loser: "bot" }
    });
    expect(applyTimeoutLoss(state, "human")).toEqual(state);
  });
});
