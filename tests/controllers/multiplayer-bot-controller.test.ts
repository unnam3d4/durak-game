import { describe, expect, it } from "vitest";
import { MultiplayerBotController } from "../../src/controllers/multiplayer-bot-controller";
import { toMultiplayerPlayerView } from "../../src/core/multiplayer-public-view";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("MultiplayerBotController", () => {
  it("always returns one of the legal actions in representative phases", async () => {
    const states = [
      makeMultiplayerState({
        attackerId: "bot",
        defenderId: "bot2",
        activePlayerId: "bot",
        phase: "attack",
        table: []
      }),
      makeMultiplayerState({
        hands: {
          human: [card("diamonds", 6)],
          bot: [card("clubs", 8), card("spades", 6)],
          bot2: [card("clubs", 7)],
          bot3: []
        },
        trumpCard: card("spades", 14),
        attackerId: "bot2",
        defenderId: "bot",
        activePlayerId: "bot",
        phase: "defend",
        table: [{ attack: card("clubs", 7) }],
        defenderHandSizeAtBoutStart: 2
      }),
      makeMultiplayerState({
        hands: {
          human: [card("diamonds", 7)],
          bot: [card("clubs", 7)],
          bot2: [card("spades", 10)],
          bot3: []
        },
        attackerId: "human",
        defenderId: "bot2",
        activePlayerId: "bot",
        phase: "throw-in",
        table: [
          {
            attack: card("hearts", 7),
            defense: card("hearts", 10)
          }
        ],
        defenderHandSizeAtBoutStart: 3,
        throwInCursor: 1
      })
    ];

    const controller = new MultiplayerBotController(() => 0.5, "hard");
    for (const state of states) {
      const view = toMultiplayerPlayerView(state, "bot");
      const action = await controller.requestAction(view);
      expect(getMultiplayerLegalActions(state, "bot")).toContainEqual(action);
    }
  });

  it("prefers a non-trump opening card when a comparable trump is available", async () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("hearts", 8), card("clubs", 8)],
        bot2: [card("spades", 9)],
        bot3: []
      },
      trumpCard: card("hearts", 14),
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });

    const action = await new MultiplayerBotController(() => 0.5, "hard")
      .requestAction(toMultiplayerPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "clubs-9"
    });
  });

  it("prefers a same-suit defense over spending a trump", async () => {
    const attack = card("clubs", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("clubs", 8), card("spades", 6)],
        bot2: [attack],
        bot3: []
      },
      trumpCard: card("spades", 14),
      attackerId: "bot2",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack }],
      defenderHandSizeAtBoutStart: 2
    });

    const action = await new MultiplayerBotController(() => 0.5, "hard")
      .requestAction(toMultiplayerPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: "clubs-8"
    });
  });

  it("dumps a legal non-trump when the defender has already taken", async () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("clubs", 7), card("hearts", 7)],
        bot2: [card("spades", 9)],
        bot3: []
      },
      trumpCard: card("hearts", 14),
      attackerId: "human",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "taking",
      table: [{ attack: card("diamonds", 7) }],
      defenderHandSizeAtBoutStart: 3,
      throwInCursor: 1
    });

    const action = await new MultiplayerBotController(() => 0.5, "hard")
      .requestAction(toMultiplayerPlayerView(state, "bot"));

    expect(action).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "clubs-7"
    });
  });

  it("hard bot exploits a defender suit weakness learned from public play", async () => {
    const controller = new MultiplayerBotController(() => 0.5, "hard");

    const observedTake = makeMultiplayerState({
      hands: {
        human: [card("spades", 6)],
        bot: [card("diamonds", 9)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 6),
      attackerId: "human",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "taking",
      table: [{ attack: card("clubs", 7) }],
      defenderHandSizeAtBoutStart: 3,
      turnNumber: 50
    });

    await controller.requestAction(
      toMultiplayerPlayerView(observedTake, "bot")
    );

    const nextBout = makeMultiplayerState({
      hands: {
        human: [card("spades", 6)],
        bot: [card("diamonds", 8), card("clubs", 9), card("spades", 12)],
        bot2: [card("hearts", 10), card("spades", 11)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 6),
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 3,
      turnNumber: 51
    });

    const action = await controller.requestAction(
      toMultiplayerPlayerView(nextBout, "bot")
    );

    expect(action).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "clubs-8"
    });
  });

  it("easy bot does not use perfect remembered suit weakness", async () => {
    const controller = new MultiplayerBotController(() => 0.5, "easy");

    const observedTake = makeMultiplayerState({
      hands: {
        human: [card("spades", 6)],
        bot: [card("diamonds", 9)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 6),
      attackerId: "human",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "taking",
      table: [{ attack: card("clubs", 7) }],
      defenderHandSizeAtBoutStart: 3,
      turnNumber: 52
    });

    await controller.requestAction(
      toMultiplayerPlayerView(observedTake, "bot")
    );

    const nextBout = makeMultiplayerState({
      hands: {
        human: [card("spades", 6)],
        bot: [card("diamonds", 8), card("clubs", 9), card("spades", 12)],
        bot2: [card("hearts", 10), card("spades", 11)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 6),
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 3,
      turnNumber: 53
    });

    const action = await controller.requestAction(
      toMultiplayerPlayerView(nextBout, "bot")
    );

    expect(action).toEqual({
      type: "play-attack",
      playerId: "bot",
      cardId: "diamonds-8"
    });
  });
});
