import { describe, expect, it } from "vitest";
import type { MultiplayerGameState } from "../../src/core/multiplayer-game-types";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { card } from "../support/match-fixtures";

function makeMulti(
  overrides: Partial<MultiplayerGameState> = {}
): MultiplayerGameState {
  const base = createMultiplayerMatch(424242, 3);
  return {
    ...base,
    ...overrides,
    hands: overrides.hands ?? base.hands,
    table: overrides.table ?? base.table,
    talon: overrides.talon ?? base.talon,
    discard: overrides.discard ?? base.discard,
    finishOrder: overrides.finishOrder ?? base.finishOrder
  };
}

describe("multiplayer legal actions", () => {
  it("only lets the primary attacker open the bout", () => {
    const state = makeMulti({
      attackerId: "bot2",
      defenderId: "human",
      activePlayerId: "bot2",
      phase: "attack",
      table: []
    });

    expect(
      getMultiplayerLegalActions(state, "bot2").some(
        (action) => action.type === "play-attack"
      )
    ).toBe(true);
    expect(getMultiplayerLegalActions(state, "human")).toEqual([]);
    expect(getMultiplayerLegalActions(state, "bot")).toEqual([]);
  });

  it("allows the defender to choose any unbeaten attack to cover", () => {
    const state = makeMulti({
      hands: {
        human: [card("spades", 8), card("hearts", 9)],
        bot: [],
        bot2: [],
        bot3: []
      },
      trumpCard: card("spades", 6),
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2,
      table: [
        { attack: card("clubs", 7) },
        { attack: card("hearts", 8) }
      ]
    });

    const defenses = getMultiplayerLegalActions(state, "human").filter(
      (action) => action.type === "play-defense"
    );

    expect(defenses).toContainEqual({
      type: "play-defense",
      playerId: "human",
      attackCardId: "clubs-7",
      cardId: "spades-8"
    });
    expect(defenses).toContainEqual({
      type: "play-defense",
      playerId: "human",
      attackCardId: "hearts-8",
      cardId: "hearts-9"
    });
  });

  it("lets another attacker throw matching ranks after a defense", () => {
    const state = makeMulti({
      hands: {
        human: [card("diamonds", 7), card("clubs", 11)],
        bot: [card("clubs", 9)],
        bot2: [card("spades", 10)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "human",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 4,
      table: [
        {
          attack: card("hearts", 7),
          defense: card("hearts", 10)
        }
      ]
    });

    const actions = getMultiplayerLegalActions(state, "human");
    expect(actions).toContainEqual({
      type: "play-attack",
      playerId: "human",
      cardId: "diamonds-7"
    });
    expect(actions).not.toContainEqual({
      type: "play-attack",
      playerId: "human",
      cardId: "clubs-11"
    });
    expect(actions).toContainEqual({
      type: "pass-throw-in",
      playerId: "human"
    });
  });

  it("caps total attacks by the defender hand size at bout start", () => {
    const state = makeMulti({
      hands: {
        human: [card("diamonds", 7)],
        bot: [card("clubs", 9)],
        bot2: [card("spades", 10)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "human",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 2,
      table: [
        { attack: card("hearts", 7), defense: card("hearts", 8) },
        { attack: card("clubs", 8), defense: card("clubs", 10) }
      ]
    });

    expect(getMultiplayerLegalActions(state, "human")).toEqual([
      { type: "pass-throw-in", playerId: "human" }
    ]);
  });

  it("does not let a finished participant act", () => {
    const state = makeMulti({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      finishOrder: ["human"]
    });

    expect(getMultiplayerLegalActions(state, "human")).toEqual([]);
  });

  it("offers matching-rank transfers only in Perevodnoy before any defense", () => {
    const base = {
      hands: {
        human: [card("clubs", 10)],
        bot: [
          card("diamonds", 7),
          card("hearts", 7),
          card("spades", 9)
        ],
        bot2: [
          card("clubs", 8),
          card("diamonds", 9),
          card("hearts", 10)
        ],
        bot3: []
      },
      attackerId: "human" as const,
      defenderId: "bot" as const,
      activePlayerId: "bot" as const,
      phase: "defend" as const,
      table: [{ attack: card("clubs", 7) }],
      defenderHandSizeAtBoutStart: 3
    };

    const podkidnoy = makeMulti({
      ...base,
      variant: "podkidnoy"
    });
    expect(
      getMultiplayerLegalActions(podkidnoy, "bot").some(
        (action) => action.type === "transfer"
      )
    ).toBe(false);

    const perevodnoy = makeMulti({
      ...base,
      variant: "perevodnoy"
    });
    const transfers = getMultiplayerLegalActions(
      perevodnoy,
      "bot"
    ).filter((action) => action.type === "transfer");

    expect(transfers).toContainEqual({
      type: "transfer",
      playerId: "bot",
      cardIds: ["diamonds-7"]
    });
    expect(transfers).toContainEqual({
      type: "transfer",
      playerId: "bot",
      cardIds: ["hearts-7"]
    });
    expect(transfers).toContainEqual({
      type: "transfer",
      playerId: "bot",
      cardIds: ["diamonds-7", "hearts-7"]
    });
  });

  it("does not allow transfer after the defender has covered a card", () => {
    const state = makeMulti({
      variant: "perevodnoy",
      hands: {
        human: [card("clubs", 10)],
        bot: [card("diamonds", 7), card("spades", 9)],
        bot2: [card("clubs", 8), card("diamonds", 9)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [
        {
          attack: card("clubs", 7),
          defense: card("clubs", 8)
        }
      ],
      defenderHandSizeAtBoutStart: 2
    });

    expect(
      getMultiplayerLegalActions(state, "bot").some(
        (action) => action.type === "transfer"
      )
    ).toBe(false);
  });

  it("does not transfer more cards than the next defender can receive", () => {
    const state = makeMulti({
      variant: "perevodnoy",
      hands: {
        human: [card("clubs", 10)],
        bot: [card("diamonds", 7), card("spades", 9)],
        bot2: [card("clubs", 8)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack: card("clubs", 7) }],
      defenderHandSizeAtBoutStart: 2
    });

    expect(
      getMultiplayerLegalActions(state, "bot").some(
        (action) => action.type === "transfer"
      )
    ).toBe(false);
  });
});
