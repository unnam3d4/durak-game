import { describe, expect, it } from "vitest";
import { MultiplayerBotMemory } from "../../src/controllers/multiplayer-bot-memory";
import { toMultiplayerPlayerView } from "../../src/core/multiplayer-public-view";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("MultiplayerBotMemory", () => {
  it("remembers publicly taken cards for the correct defender", () => {
    const attack = card("clubs", 9);
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("spades", 7)],
        bot2: [card("hearts", 8)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 6),
      table: [{ attack }],
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "taking",
      defenderHandSizeAtBoutStart: 1,
      turnNumber: 40
    });

    const memory = new MultiplayerBotMemory();
    memory.observe(toMultiplayerPlayerView(state, "bot"));

    expect(memory.knownCardsFor("bot2")).toContainEqual(attack);
    expect(memory.knownCardsFor("human")).not.toContainEqual(attack);
  });

  it("forgets a known card when it is later played publicly", () => {
    const known = card("clubs", 9);
    const memory = new MultiplayerBotMemory();

    memory.observe(
      toMultiplayerPlayerView(
        makeMultiplayerState({
          hands: {
            human: [card("diamonds", 6)],
            bot: [card("spades", 7)],
            bot2: [card("hearts", 8)],
            bot3: []
          },
          talon: [],
          trumpCard: card("hearts", 6),
          table: [{ attack: known }],
          attackerId: "bot",
          defenderId: "bot2",
          activePlayerId: "bot",
          phase: "taking",
          defenderHandSizeAtBoutStart: 1,
          turnNumber: 41
        }),
        "bot"
      )
    );

    memory.observe(
      toMultiplayerPlayerView(
        makeMultiplayerState({
          hands: {
            human: [card("diamonds", 6)],
            bot: [card("spades", 7)],
            bot2: [card("hearts", 8)],
            bot3: []
          },
          talon: [],
          trumpCard: card("hearts", 6),
          table: [{ attack: known }],
          attackerId: "bot2",
          defenderId: "human",
          activePlayerId: "human",
          phase: "defend",
          defenderHandSizeAtBoutStart: 1,
          turnNumber: 42
        }),
        "bot"
      )
    );

    expect(memory.knownCardsFor("bot2")).not.toContainEqual(known);
  });

  it("tracks suit weakness separately for each defender", () => {
    const memory = new MultiplayerBotMemory();

    memory.observe(
      toMultiplayerPlayerView(
        makeMultiplayerState({
          hands: {
            human: [card("diamonds", 6)],
            bot: [card("spades", 7)],
            bot2: [card("hearts", 8)],
            bot3: []
          },
          talon: [],
          trumpCard: card("hearts", 6),
          table: [
            {
              attack: card("clubs", 7),
              defense: card("hearts", 9)
            }
          ],
          attackerId: "bot",
          defenderId: "bot2",
          activePlayerId: "bot",
          phase: "throw-in",
          defenderHandSizeAtBoutStart: 1,
          turnNumber: 43
        }),
        "bot"
      )
    );

    expect(memory.suitWeaknessFor("bot2").get("clubs")).toBeGreaterThan(0);
    expect(memory.suitWeaknessFor("human").get("clubs") ?? 0).toBe(0);
  });

  it("reconstructs a top trump from public cards without seeing hidden hands", () => {
    const candidate = card("hearts", 11);
    const state = makeMultiplayerState({
      hands: {
        human: [card("spades", 6)],
        bot: [candidate, card("clubs", 10)],
        bot2: [card("diamonds", 7)],
        bot3: []
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
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      defenderHandSizeAtBoutStart: 1
    });

    const memory = new MultiplayerBotMemory();
    const view = toMultiplayerPlayerView(state, "bot");
    memory.observe(view);

    expect(memory.isKnownTopTrump(view, candidate)).toBe(true);
  });

  it("counts repeated identical public positions without using hidden cards", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("clubs", 7), card("spades", 9)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 6),
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 1,
      turnNumber: 80
    });
    const view = toMultiplayerPlayerView(state, "bot");
    const memory = new MultiplayerBotMemory();

    memory.observe(view);
    expect(memory.positionVisitCount(view)).toBe(1);
    memory.observe({ ...view, turnNumber: 81 });
    expect(memory.positionVisitCount(view)).toBe(2);
    memory.observe({ ...view, turnNumber: 82 });
    expect(memory.positionVisitCount(view)).toBe(3);
  });

  it("learns a forced-resolved take from the public event after the table is cleared", () => {
    const taken = card("clubs", 9);
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 6)],
        bot: [card("spades", 7)],
        bot2: [taken, card("hearts", 8)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 6),
      table: [],
      attackerId: "bot2",
      defenderId: "human",
      activePlayerId: "bot2",
      phase: "attack",
      lastTakeEvent: {
        id: 91,
        defenderId: "bot2",
        cards: [taken],
        triggerAttack: taken
      },
      turnNumber: 91
    });

    const memory = new MultiplayerBotMemory();
    memory.observe(toMultiplayerPlayerView(state, "bot"));

    expect(memory.knownCardsFor("bot2")).toContainEqual(taken);
    expect(memory.suitWeaknessFor("bot2").get("clubs")).toBeGreaterThan(0);
  });
});
