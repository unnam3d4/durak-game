import { describe, expect, it } from "vitest";
import { applyAction } from "../../src/rules/reducer";
import { getLegalActions } from "../../src/rules/legal-actions";
import { refillHands } from "../../src/rules/resolution";
import { card, makeState } from "../support/match-fixtures";

describe("Podkidnoy reducer", () => {
  it("moves an attacking card from hand onto the table", () => {
    const attack = card("clubs", 6);
    const state = makeState({
      hands: { human: [attack, card("hearts", 7)], bot: [card("clubs", 8)] },
      table: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      defenderHandSizeAtBoutStart: 1
    });

    const next = applyAction(state, {
      type: "play-attack",
      playerId: "human",
      cardId: attack.id
    });

    expect(next.hands.human.map((c) => c.id)).not.toContain(attack.id);
    expect(next.table).toEqual([{ attack }]);
    expect(next.activePlayerId).toBe("bot");
    expect(next.phase).toBe("defend");
  });

  it("moves a defense card onto the targeted pair", () => {
    const attack = card("clubs", 6);
    const defense = card("clubs", 7);
    const state = makeState({
      hands: { human: [attack], bot: [defense] },
      table: [{ attack }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 1,
      trumpCard: card("spades", 14)
    });

    const next = applyAction(state, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: defense.id
    });

    expect(next.table).toEqual([{ attack, defense }]);
    expect(next.hands.bot).toEqual([]);
    expect(next.activePlayerId).toBe("human");
    expect(next.phase).toBe("throw-in");
  });

  it("rejects an action not present in getLegalActions", () => {
    const state = makeState();
    const illegalAction = {
      type: "play-attack",
      playerId: state.attackerId,
      cardId: "not-a-real-card"
    } as const;
    expect(() => applyAction(state, illegalAction)).toThrow("Illegal action");
  });

  it("lets the attacker throw matching cards after defender chooses take", () => {
    const attack = card("clubs", 6);
    const extra = card("diamonds", 6);
    const state = makeState({
      hands: { human: [extra, card("hearts", 7)], bot: [card("clubs", 8)] },
      talon: [],
      table: [{ attack }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2
    });

    const taking = applyAction(state, { type: "take", playerId: "bot" });
    expect(taking.phase).toBe("taking");
    expect(taking.activePlayerId).toBe("human");
    expect(taking.table).toEqual([{ attack }]);
    expect(taking.hands.bot.map((c) => c.id)).not.toContain(attack.id);

    const throwIn = getLegalActions(taking, "human").find(
      (action) => action.type === "play-attack" && action.cardId === extra.id
    );
    expect(throwIn).toBeDefined();
    const withExtra = applyAction(taking, throwIn!);
    expect(withExtra.phase).toBe("taking");
    expect(withExtra.activePlayerId).toBe("human");
    expect(withExtra.table.map((pair) => pair.attack.id)).toEqual([attack.id, extra.id]);

    const finished = applyAction(withExtra, { type: "finish-bout", playerId: "human" });
    expect(finished.table).toEqual([]);
    expect(finished.hands.bot.map((c) => c.id)).toEqual(
      expect.arrayContaining([attack.id, extra.id])
    );
    expect(finished.attackerId).toBe("human");
  });

  it("take hands control to the attacker without collecting cards yet", () => {
    const attack = card("clubs", 6);
    const state = makeState({
      hands: { human: [card("hearts", 7)], bot: [card("clubs", 8)] },
      talon: [],
      table: [{ attack }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 1
    });

    const next = applyAction(state, { type: "take", playerId: "bot" });
    expect(next.hands.bot.map((c) => c.id)).not.toContain(attack.id);
    expect(next.table).toEqual([{ attack }]);
    expect(next.activePlayerId).toBe("human");
    expect(next.attackerId).toBe("human");
    expect(next.phase).toBe("taking");
  });

  it("successful defense discards table and makes old defender the next attacker", () => {
    const attack = card("clubs", 6);
    const defense = card("clubs", 7);
    const state = makeState({
      hands: { human: [card("hearts", 8)], bot: [card("spades", 9)] },
      talon: [],
      table: [{ attack, defense }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 2
    });

    const next = applyAction(state, { type: "finish-bout", playerId: "human" });
    expect(next.discard.map((c) => c.id)).toEqual(
      expect.arrayContaining([attack.id, defense.id])
    );
    expect(next.table).toEqual([]);
    expect(next.attackerId).toBe("bot");
    expect(next.defenderId).toBe("human");
  });

  it("refills attacker first and defender last up to six cards", () => {
    const draw1 = card("clubs", 10);
    const draw2 = card("diamonds", 10);
    const state = makeState({
      hands: {
        human: [card("hearts", 6), card("hearts", 7), card("hearts", 8), card("hearts", 9), card("hearts", 10)],
        bot: [card("spades", 6), card("spades", 7), card("spades", 8), card("spades", 9), card("spades", 10)]
      },
      talon: [draw1, draw2],
      attackerId: "human",
      defenderId: "bot"
    });

    const next = refillHands(state);
    expect(next.hands.human.at(-1)?.id).toBe(draw1.id);
    expect(next.hands.bot.at(-1)?.id).toBe(draw2.id);
    expect(next.talon).toEqual([]);
  });
});
