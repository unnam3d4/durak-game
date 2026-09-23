import { describe, expect, it } from "vitest";
import { BotController } from "../../src/controllers/bot-controller";
import { toPlayerView } from "../../src/core/public-view";
import { card, makeState } from "../support/match-fixtures";

describe("bot privacy and action selection", () => {
  it("does not expose the human hidden hand to a bot view", () => {
    const state = makeState({
      activePlayerId: "bot",
      attackerId: "bot",
      defenderId: "human",
      phase: "attack",
      table: []
    });
    const view = toPlayerView(state, "bot");
    expect("hands" in view).toBe(false);
    expect(view.ownHand).toEqual(state.hands.bot);
    expect(JSON.stringify(view)).not.toContain(state.hands.human[0]!.id);
  });

  it("produces the same bot-visible shape when only hidden human cards change", () => {
    const base = makeState({
      activePlayerId: "bot",
      attackerId: "bot",
      defenderId: "human",
      phase: "attack",
      table: []
    });
    const stateA = {
      ...base,
      hands: { ...base.hands, human: [card("clubs", 6), card("hearts", 7)] }
    };
    const stateB = {
      ...base,
      hands: { ...base.hands, human: [card("diamonds", 12), card("spades", 14)] }
    };
    const a = toPlayerView(stateA, "bot");
    const b = toPlayerView(stateB, "bot");
    expect(a).toEqual(b);
  });

  it("returns only a legal action", async () => {
    const state = makeState({
      activePlayerId: "bot",
      attackerId: "bot",
      defenderId: "human",
      phase: "attack",
      table: []
    });
    const controller = new BotController(() => 0.5);
    const view = toPlayerView(state, "bot");
    const action = await controller.requestAction(view);
    expect(view.legalActions).toContainEqual(action);
  });

  it("prefers a non-trump defense when one exists", async () => {
    const attack = card("hearts", 8);
    const state = makeState({
      hands: {
        human: [attack],
        bot: [card("hearts", 9), card("spades", 6)]
      },
      trumpCard: card("spades", 14),
      table: [{ attack }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2
    });
    const controller = new BotController(() => 0.5);
    const action = await controller.requestAction(toPlayerView(state, "bot"));
    expect(action).toEqual({
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: "hearts-9"
    });
  });
});

// HumanController is intentionally thin: the UI supplies an already-legal action.
