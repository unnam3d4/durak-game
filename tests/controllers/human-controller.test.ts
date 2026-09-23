import { describe, expect, it } from "vitest";
import { HumanController } from "../../src/controllers/human-controller";
import { toPlayerView } from "../../src/core/public-view";
import { makeState } from "../support/match-fixtures";

describe("HumanController", () => {
  it("resolves a pending request with the submitted action", async () => {
    const state = makeState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });
    const view = toPlayerView(state, "human");
    const controller = new HumanController();
    const pending = controller.requestAction(view);
    const action = view.legalActions[0]!;
    controller.submitAction(action);
    await expect(pending).resolves.toEqual(action);
  });
});
