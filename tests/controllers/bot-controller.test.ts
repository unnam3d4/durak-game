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

  it("difficulty changes decision quality without changing legal actions", async () => {
    const state = makeState({
      hands: {
        human: [card("clubs", 6), card("diamonds", 8), card("spades", 9)],
        bot: [card("hearts", 6), card("clubs", 7), card("diamonds", 7)]
      },
      trumpCard: card("hearts", 14),
      activePlayerId: "bot",
      attackerId: "bot",
      defenderId: "human",
      phase: "attack",
      table: []
    });
    const view = toPlayerView(state, "bot");

    const weakRandomValues = [0, 0];
    const easy = new BotController(() => weakRandomValues.shift() ?? 0, "easy");
    // Even the lowest random roll must not force a deliberate mistake on hard.
    const hard = new BotController(() => 0, "hard");

    const easyAction = await easy.requestAction(view);
    const hardAction = await hard.requestAction(view);

    expect(view.legalActions).toContainEqual(easyAction);
    expect(view.legalActions).toContainEqual(hardAction);
    expect(easyAction).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "hearts-6"
    });
    expect(hardAction).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "clubs-7"
    });
  });

  it("supports weaker profiles through legal decision mistakes, never hidden-card access", async () => {
    const state = makeState({
      activePlayerId: "bot",
      attackerId: "bot",
      defenderId: "human",
      phase: "attack",
      table: []
    });
    const view = toPlayerView(state, "bot");
    const controller = new BotController(() => 0, "easy");
    const action = await controller.requestAction(view);

    expect(view.legalActions).toContainEqual(action);
    expect("hands" in view).toBe(false);
  });

  it("strong profile does not deliberately inject decision mistakes", async () => {
    const attack = card("hearts", 8);
    const state = makeState({
      hands: {
        human: [attack],
        bot: [card("hearts", 9), card("spades", 14)]
      },
      trumpCard: card("spades", 6),
      table: [{ attack }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2
    });
    const action = await new BotController(() => 0, "hard")
      .requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: "hearts-9"
    });
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

  it("can lead all remaining equal-rank cards together in the endgame", async () => {
    const state = makeState({
      hands: {
        human: [card("clubs", 8), card("diamonds", 9)],
        bot: [card("clubs", 7), card("diamonds", 7)]
      },
      talon: [],
      trumpCard: card("hearts", 14),
      activePlayerId: "bot",
      attackerId: "bot",
      defenderId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 2
    });

    const action = await new BotController(() => 0.5, "hard")
      .requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-attack-set",
      playerId: "bot",
      cardIds: ["clubs-7", "diamonds-7"]
    });
  });

  it("opens with a non-trump rank it can continue throwing in", async () => {
    const state = makeState({
      hands: {
        human: [card("clubs", 6), card("diamonds", 7), card("spades", 8), card("clubs", 9)],
        bot: [card("clubs", 6), card("diamonds", 7), card("clubs", 7), card("hearts", 8)]
      },
      trumpCard: card("hearts", 14),
      activePlayerId: "bot",
      attackerId: "bot",
      defenderId: "human",
      phase: "attack",
      table: []
    });

    const action = await new BotController(() => 0.5).requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({ type: "play-attack", playerId: "bot", cardId: "diamonds-7" });
  });

  it("throws a high non-trump onto a defender who has already chosen to take", async () => {
    const attack = card("clubs", 12);
    const state = makeState({
      hands: {
        human: [card("spades", 6), card("diamonds", 7), card("clubs", 8)],
        bot: [card("diamonds", 12), card("hearts", 12), card("spades", 9)]
      },
      trumpCard: card("hearts", 14),
      table: [{ attack }],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "taking",
      defenderHandSizeAtBoutStart: 3
    });

    const action = await new BotController(() => 0.5).requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({ type: "play-attack", playerId: "bot", cardId: "diamonds-12" });
  });

  it("pressures a one-card defender with a legal trump in the endgame", async () => {
    const attack = card("clubs", 9);
    const defense = card("clubs", 10);
    const state = makeState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("hearts", 9), card("spades", 11), card("diamonds", 12), card("clubs", 13)]
      },
      trumpCard: card("hearts", 14),
      talon: [],
      table: [{ attack, defense }],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 2
    });

    const action = await new BotController(() => 0.5, "hard")
      .requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "hearts-9"
    });
  });

  it("keeps the defender from escaping when a legal trump throw-in is available", async () => {
    const attack = card("clubs", 9);
    const defense = card("clubs", 10);
    const state = makeState({
      hands: {
        human: [],
        bot: [card("hearts", 9), card("spades", 11), card("diamonds", 12), card("clubs", 13)]
      },
      trumpCard: card("hearts", 14),
      talon: [],
      table: [{ attack, defense }],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 2
    });

    const action = await new BotController(() => 0.5, "normal")
      .requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "hearts-9"
    });
  });

  it("keeps a valuable trump instead of throwing it in early", async () => {
    const attack = card("clubs", 9);
    const defense = card("clubs", 10);
    const state = makeState({
      hands: {
        human: [card("spades", 6), card("diamonds", 7), card("clubs", 8)],
        bot: [card("hearts", 9), card("diamonds", 9), card("spades", 11)]
      },
      trumpCard: card("hearts", 14),
      talon: makeState().talon.slice(0, 12),
      table: [{ attack, defense }],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 3
    });

    const action = await new BotController(() => 0.5).requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({ type: "play-attack", playerId: "bot", cardId: "diamonds-9" });
  });

  it("takes an early low-trump attack instead of burning its only ace trump", async () => {
    const attack = card("hearts", 6);
    const state = makeState({
      hands: {
        human: [attack, card("clubs", 7), card("diamonds", 8), card("spades", 9)],
        bot: [card("hearts", 14), card("clubs", 10), card("diamonds", 11), card("spades", 12)]
      },
      trumpCard: card("hearts", 9),
      talon: makeState().talon.slice(0, 16),
      table: [{ attack }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 4
    });

    const action = await new BotController(() => 0.5).requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({ type: "take", playerId: "bot" });
  });

  it("covers a trump attack in the endgame when tempo matters", async () => {
    const attack = card("hearts", 9);
    const defense = card("hearts", 10);
    const state = makeState({
      hands: {
        human: [attack, card("clubs", 7)],
        bot: [defense, card("diamonds", 8)]
      },
      trumpCard: card("hearts", 6),
      talon: [],
      table: [{ attack }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2
    });

    const action = await new BotController(() => 0.5).requestAction(toPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: defense.id
    });
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
