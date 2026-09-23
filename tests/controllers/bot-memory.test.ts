import { describe, expect, it } from "vitest";
import { BotMemory } from "../../src/controllers/bot-memory";
import { toPlayerView } from "../../src/core/public-view";
import { card, makeState } from "../support/match-fixtures";

describe("BotMemory", () => {
  it("remembers cards the opponent publicly takes", () => {
    const attack = card("clubs", 9);
    const state = makeState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("spades", 7)]
      },
      talon: [],
      trumpCard: card("hearts", 6),
      table: [{ attack }],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "taking",
      defenderHandSizeAtBoutStart: 1,
      turnNumber: 30
    });

    const memory = new BotMemory();
    memory.observe(toPlayerView(state, "bot"));

    expect(memory.knownOpponentCards()).toContainEqual(attack);
  });

  it("forgets a known opponent card when that card is later played publicly", () => {
    const known = card("clubs", 9);
    const memory = new BotMemory();

    memory.observe(toPlayerView(makeState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("spades", 7)]
      },
      talon: [],
      trumpCard: card("hearts", 6),
      table: [{ attack: known }],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "taking",
      defenderHandSizeAtBoutStart: 1,
      turnNumber: 31
    }), "bot"));

    memory.observe(toPlayerView(makeState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("clubs", 10)]
      },
      talon: [],
      trumpCard: card("hearts", 6),
      table: [{ attack: known }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 1,
      turnNumber: 32
    }), "bot"));

    expect(memory.knownOpponentCards()).not.toContainEqual(known);
  });

  it("reconstructs exhausted higher trumps from the public discard pile", () => {
    const candidate = card("hearts", 11);
    const state = makeState({
      hands: {
        human: [card("spades", 6)],
        bot: [candidate, card("clubs", 10)]
      },
      talon: [],
      discard: [
        card("hearts", 12),
        card("hearts", 13),
        card("hearts", 14)
      ],
      trumpCard: card("hearts", 6),
      table: [],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "attack",
      defenderHandSizeAtBoutStart: 1
    });

    const memory = new BotMemory();
    const view = toPlayerView(state, "bot");
    memory.observe(view);

    expect(memory.isKnownTopTrump(view, candidate)).toBe(true);
  });

  it("does not treat a lower trump as top when a higher trump is known in opponent hand", () => {
    const memory = new BotMemory();
    const higher = card("hearts", 14);

    memory.observe(toPlayerView(makeState({
      hands: {
        human: [card("spades", 6)],
        bot: [card("clubs", 7)]
      },
      talon: [],
      trumpCard: card("hearts", 6),
      table: [{ attack: higher }],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "taking",
      defenderHandSizeAtBoutStart: 1,
      turnNumber: 33
    }), "bot"));

    const candidate = card("hearts", 13);
    const state = makeState({
      hands: {
        human: [higher],
        bot: [candidate, card("clubs", 10)]
      },
      talon: [],
      trumpCard: card("hearts", 6),
      table: [],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "attack",
      defenderHandSizeAtBoutStart: 1,
      turnNumber: 34
    });
    const view = toPlayerView(state, "bot");
    memory.observe(view);

    expect(memory.isKnownTopTrump(view, candidate)).toBe(false);
  });
});
