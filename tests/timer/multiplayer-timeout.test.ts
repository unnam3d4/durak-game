import { describe, expect, it } from "vitest";
import { chooseMultiplayerTimeoutAction } from "../../src/timer/multiplayer-timeout";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("multiplayer timeout fallback", () => {
  it("takes automatically when the active defender runs out of time", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("clubs", 8)],
        bot: [card("diamonds", 9)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: card("clubs", 7) }],
      defenderHandSizeAtBoutStart: 1
    });

    expect(chooseMultiplayerTimeoutAction(state)).toEqual({
      type: "take",
      playerId: "human"
    });
  });

  it.each(["throw-in", "taking"] as const)(
    "passes automatically in %s phase",
    (phase) => {
      const state = makeMultiplayerState({
        hands: {
          human: [card("diamonds", 9)],
          bot: [card("clubs", 10)],
          bot2: [card("hearts", 11)],
          bot3: []
        },
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase,
        table: [
          {
            attack: card("clubs", 7),
            ...(phase === "throw-in"
              ? { defense: card("clubs", 8) }
              : {})
          }
        ],
        defenderHandSizeAtBoutStart: 3
      });

      expect(chooseMultiplayerTimeoutAction(state)).toEqual({
        type: "pass-throw-in",
        playerId: "human"
      });
    }
  );

  it("plays the lowest non-trump single card on an opening timeout", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [
          card("hearts", 6),
          card("clubs", 9),
          card("diamonds", 7)
        ],
        bot: [card("clubs", 10), card("diamonds", 10)],
        bot2: [card("spades", 11)],
        bot3: []
      },
      trumpCard: card("hearts", 14),
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 2
    });

    expect(chooseMultiplayerTimeoutAction(state)).toEqual({
      type: "play-attack",
      playerId: "human",
      cardId: "diamonds-7"
    });
  });

  it("returns null once the match is finished", () => {
    const state = makeMultiplayerState({
      phase: "finished",
      foolId: "bot",
      activePlayerId: "bot"
    });

    expect(chooseMultiplayerTimeoutAction(state)).toBeNull();
  });
});
