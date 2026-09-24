import { describe, expect, it } from "vitest";
import { deriveCardTransitIntents } from "../../src/ui/card-transit-event";
import { derivePresentationEvent } from "../../src/ui/match-presentation-event";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("deriveCardTransitIntents", () => {
  it("moves an opponent attack from that seat to the table", () => {
    const attack = card("clubs", 7);
    const before = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 9)],
        bot: [attack, card("hearts", 10)],
        bot2: [card("spades", 11)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });
    const action = {
      type: "play-attack" as const,
      playerId: "bot" as const,
      cardId: attack.id
    };
    const after = applyMultiplayerAction(before, action);

    expect(
      deriveCardTransitIntents(
        before,
        action,
        after,
        derivePresentationEvent(before, action, after)
      )
    ).toEqual([
      {
        type: "opponent-to-table",
        participantId: "bot",
        cardIds: [attack.id]
      }
    ]);
  });

  it("moves every card from a multi-card opponent play to the table", () => {
    const first = card("clubs", 7);
    const second = card("diamonds", 7);
    const before = makeMultiplayerState({
      hands: {
        human: [card("spades", 10), card("hearts", 11)],
        bot: [first, second, card("clubs", 12)],
        bot2: [card("spades", 13)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 2
    });
    const action = {
      type: "play-attack-set" as const,
      playerId: "bot" as const,
      cardIds: [first.id, second.id]
    };
    const after = applyMultiplayerAction(before, action);

    expect(
      deriveCardTransitIntents(before, action, after, null)
    ).toEqual([
      {
        type: "opponent-to-table",
        participantId: "bot",
        cardIds: [first.id, second.id]
      }
    ]);
  });

  it("moves a taken bout from the table to the defender", () => {
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
      defenderHandSizeAtBoutStart: 1
    });
    const action = {
      type: "take" as const,
      playerId: "bot" as const
    };
    const after = applyMultiplayerAction(before, action);
    const presentation = derivePresentationEvent(before, action, after);

    expect(
      deriveCardTransitIntents(before, action, after, presentation)
    ).toEqual([
      {
        type: "table-to-hand",
        participantId: "bot",
        cardIds: [attack.id]
      }
    ]);
  });

  it("moves a successfully defended bout from the table to discard", () => {
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
    const presentation = derivePresentationEvent(before, action, after);

    expect(
      deriveCardTransitIntents(before, action, after, presentation)
    ).toEqual([
      {
        type: "table-to-discard",
        cardIds: [attack.id, defense.id]
      }
    ]);
  });
});
