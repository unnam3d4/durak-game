import { describe, expect, it } from "vitest";
import { applyTechnicalLoss } from "../../src/rules/multiplayer-technical-loss";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("multiplayer technical loss", () => {
  it("finishes the match with the timed-out player as the fool", () => {
    const state = makeMultiplayerState({}, 4);
    const next = applyTechnicalLoss(state, "human");

    expect(next.phase).toBe("finished");
    expect(next.foolId).toBe("human");
    expect(next.finishOrder).toEqual(["bot", "bot2", "bot3"]);
    expect(next.boutFinishOrder).toEqual([]);
    expect(next.turnNumber).toBe(state.turnNumber + 1);
  });

  it("preserves players who already finished before the timeout", () => {
    const state = makeMultiplayerState(
      { finishOrder: ["bot2"], boutFinishOrder: ["bot3"] },
      4
    );
    const next = applyTechnicalLoss(state, "human");

    expect(next.finishOrder).toEqual(["bot2", "bot", "bot3"]);
    expect(next.foolId).toBe("human");
  });

  it("is idempotent after the match already finished", () => {
    const state = makeMultiplayerState({
      phase: "finished",
      foolId: "bot",
      activePlayerId: "bot"
    });

    expect(applyTechnicalLoss(state, "human")).toBe(state);
  });
});
