import { describe, expect, it } from "vitest";
import { derivePresentationEvent } from "../../src/ui/match-presentation-event";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("derivePresentationEvent", () => {
  it("captures defended table cards before a finished bout clears them", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const before = makeMultiplayerState(
      {
        hands: {
          human: [],
          bot: [card("diamonds", 9)],
          bot2: [],
          bot3: []
        },
        talon: [],
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "throw-in",
        table: [{ attack, defense }],
        defenderHandSizeAtBoutStart: 1,
        throwInCursor: 0,
        consecutivePasses: 0
      },
      2
    );
    const action = {
      type: "pass-throw-in" as const,
      playerId: "human" as const
    };
    const after = applyMultiplayerAction(before, action);

    expect(after.phase).toBe("finished");
    expect(after.table).toEqual([]);
    expect(derivePresentationEvent(before, action, after)).toEqual({
      type: "bout-discarded",
      cards: [attack, defense],
      turnNumber: after.turnNumber
    });
  });

  it("captures taken table cards and the defender before resolution clears them", () => {
    const attack = card("clubs", 7);
    const before = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 11)],
        bot: [card("hearts", 12)],
        bot2: [card("spades", 13)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack }],
      defenderHandSizeAtBoutStart: 1,
      throwInCursor: 0,
      consecutivePasses: 0
    });
    const action = {
      type: "take" as const,
      playerId: "bot" as const
    };
    const after = applyMultiplayerAction(before, action);

    expect(after.table).toEqual([]);
    expect(derivePresentationEvent(before, action, after)).toEqual({
      type: "bout-taken",
      cards: [attack],
      defenderId: "bot",
      turnNumber: after.turnNumber
    });
  });

  it("does not emit a resolution event while cards remain on the table", () => {
    const attack = card("clubs", 7);
    const before = makeMultiplayerState({
      hands: {
        human: [attack, card("diamonds", 9)],
        bot: [card("clubs", 8), card("hearts", 11)],
        bot2: [card("spades", 12)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });
    const action = {
      type: "play-attack" as const,
      playerId: "human" as const,
      cardId: attack.id
    };
    const after = applyMultiplayerAction(before, action);

    expect(derivePresentationEvent(before, action, after)).toBeNull();
  });
});
