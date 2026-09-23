import { describe, expect, it } from "vitest";
import { canBeat, getLegalActions } from "../../src/rules/legal-actions";
import { card, makeState } from "../support/match-fixtures";

describe("legal actions", () => {
  it("allows any single card as the opening attack", () => {
    const base = makeState();
    const state = makeState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });
    const actions = getLegalActions(state, "human");
    expect(actions.filter((a) => a.type === "play-attack")).toHaveLength(base.hands.human.length);
  });

  it("allows an opening attack with several cards of the same rank", () => {
    const state = makeState({
      hands: {
        human: [card("clubs", 7), card("diamonds", 7), card("hearts", 7), card("spades", 8)],
        bot: [card("clubs", 9), card("diamonds", 10)]
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 2
    });

    const sets = getLegalActions(state, "human").filter(
      (action) => action.type === "play-attack-set"
    );

    expect(sets).toHaveLength(3);
    expect(sets.every((action) => action.cardIds.length === 2)).toBe(true);
    expect(sets.every((action) =>
      action.cardIds.every((id) => id.endsWith("-7"))
    )).toBe(true);
  });

  it("does not allow an opening set larger than the defender can cover", () => {
    const state = makeState({
      hands: {
        human: [card("clubs", 6), card("diamonds", 6), card("hearts", 6)],
        bot: [card("clubs", 9), card("diamonds", 10)]
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 2
    });

    const sets = getLegalActions(state, "human").filter(
      (action) => action.type === "play-attack-set"
    );
    expect(sets.some((action) => action.cardIds.length === 3)).toBe(false);
  });

  it("defends with a higher same-suit card", () => {
    expect(canBeat(card("hearts", 9), card("hearts", 10), "spades")).toBe(true);
  });

  it("defends a non-trump with any trump", () => {
    expect(canBeat(card("hearts", 14), card("spades", 6), "spades")).toBe(true);
  });

  it("cannot beat a trump with a non-trump", () => {
    expect(canBeat(card("spades", 6), card("hearts", 14), "spades")).toBe(false);
  });

  it("only permits throw-ins whose rank is already on the table", () => {
    const state = makeState({
      hands: {
        human: [card("clubs", 7), card("diamonds", 10), card("spades", 11)],
        bot: [card("clubs", 9), card("hearts", 12)]
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 5,
      table: [{ attack: card("hearts", 7), defense: card("hearts", 10) }]
    });

    const attacks = getLegalActions(state, "human").filter((a) => a.type === "play-attack");
    expect(attacks.map((a) => a.cardId).sort()).toEqual(["clubs-7", "diamonds-10"]);
  });

  it("caps total attack cards to a defender starting with only three cards", () => {
    const state = makeState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 3,
      table: [
        { attack: card("clubs", 6), defense: card("clubs", 7) },
        { attack: card("diamonds", 7), defense: card("diamonds", 8) },
        { attack: card("hearts", 8), defense: card("hearts", 9) }
      ]
    });
    expect(getLegalActions(state, state.attackerId).some((a) => a.type === "play-attack")).toBe(false);
  });

  it("returns no actions to the non-active player", () => {
    const state = makeState({ activePlayerId: "human" });
    expect(getLegalActions(state, "bot")).toEqual([]);
  });
});
