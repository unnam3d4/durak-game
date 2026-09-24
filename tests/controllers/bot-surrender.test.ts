import { describe, expect, it } from "vitest";
import { shouldBotSurrender } from "../../src/controllers/bot-surrender";
import { createBotPersonality } from "../../src/controllers/multiplayer-bot-personality";
import { toMultiplayerPlayerView } from "../../src/core/multiplayer-public-view";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

const personality = {
  ...createBotPersonality(42, "bot", "normal"),
  quitTendency: 0.0015
};

describe("shouldBotSurrender", () => {
  it("never surrenders before the late-game threshold", () => {
    const state = makeMultiplayerState({
      talon: [],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "attack",
      table: [],
      turnNumber: 6
    });

    expect(
      shouldBotSurrender(
        toMultiplayerPlayerView(state, "bot"),
        personality,
        () => 0
      )
    ).toBe(false);
  });

  it("never surrenders from a competitive position", () => {
    const state = makeMultiplayerState(
      {
        talon: [],
        hands: {
          human: [card("clubs", 7), card("diamonds", 8), card("hearts", 9)],
          bot: [
            card("clubs", 10),
            card("diamonds", 11),
            card("hearts", 12),
            card("spades", 13)
          ],
          bot2: [card("clubs", 6), card("diamonds", 6), card("hearts", 6)],
          bot3: [card("clubs", 14), card("diamonds", 14), card("hearts", 14)]
        },
        attackerId: "bot",
        defenderId: "bot2",
        activePlayerId: "bot",
        phase: "attack",
        table: [],
        turnNumber: 40
      },
      4
    );

    expect(
      shouldBotSurrender(
        toMultiplayerPlayerView(state, "bot"),
        personality,
        () => 0
      )
    ).toBe(false);
  });

  it("can surrender very rarely from a clearly losing clean-bout position", () => {
    const state = makeMultiplayerState(
      {
        talon: [],
        hands: {
          human: [card("clubs", 7)],
          bot: [
            card("diamonds", 8),
            card("hearts", 9),
            card("spades", 10),
            card("clubs", 11)
          ],
          bot2: [card("diamonds", 12)],
          bot3: [card("hearts", 13)]
        },
        attackerId: "bot",
        defenderId: "bot2",
        activePlayerId: "bot",
        phase: "attack",
        table: [],
        turnNumber: 40
      },
      4
    );

    const view = toMultiplayerPlayerView(state, "bot");
    expect(shouldBotSurrender(view, personality, () => 0)).toBe(true);
    expect(shouldBotSurrender(view, personality, () => 0.999999)).toBe(false);
  });

  it("never surrenders in the middle of a bout", () => {
    const state = makeMultiplayerState({
      talon: [],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "throw-in",
      table: [{ attack: card("clubs", 7), defense: card("clubs", 8) }],
      turnNumber: 40
    });

    expect(
      shouldBotSurrender(
        toMultiplayerPlayerView(state, "bot"),
        personality,
        () => 0
      )
    ).toBe(false);
  });
});
