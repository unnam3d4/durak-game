import { describe, expect, it } from "vitest";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("multiplayer Podkidnoy reducer", () => {
  it("moves an opening attack to the defender", () => {
    const attack = card("clubs", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [attack],
        bot: [card("clubs", 8)],
        bot2: [card("diamonds", 9)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 1
    });

    const next = applyMultiplayerAction(state, {
      type: "play-attack",
      playerId: "human",
      cardId: attack.id
    });

    expect(next.hands.human).toEqual([]);
    expect(next.table).toEqual([{ attack }]);
    expect(next.activePlayerId).toBe("bot");
    expect(next.phase).toBe("defend");
  });

  it("cycles throw-in priority through every non-defender", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 7)],
        bot: [card("spades", 7)],
        bot2: [defense],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot2",
      activePlayerId: "bot2",
      phase: "defend",
      table: [{ attack }],
      defenderHandSizeAtBoutStart: 3,
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const covered = applyMultiplayerAction(state, {
      type: "play-defense",
      playerId: "bot2",
      attackCardId: attack.id,
      cardId: defense.id
    });
    expect(covered.phase).toBe("throw-in");
    expect(covered.activePlayerId).toBe("human");

    const afterMainPass = applyMultiplayerAction(covered, {
      type: "pass-throw-in",
      playerId: "human"
    });
    expect(afterMainPass.activePlayerId).toBe("bot");

    const throwIn = getMultiplayerLegalActions(afterMainPass, "bot").find(
      (action) =>
        action.type === "play-attack" &&
        action.cardId === "spades-7"
    );
    expect(throwIn).toBeDefined();

    const attackedAgain = applyMultiplayerAction(afterMainPass, throwIn!);
    expect(attackedAgain.phase).toBe("defend");
    expect(attackedAgain.activePlayerId).toBe("bot2");
    expect(attackedAgain.throwInCursor).toBe(0);
    expect(attackedAgain.consecutivePasses).toBe(0);
  });

  it("ends a defended bout after a complete round of attacker passes", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 9)],
        bot: [card("spades", 10)],
        bot2: [card("hearts", 11)],
        bot3: []
      },
      talon: [],
      discard: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      table: [{ attack, defense }],
      defenderHandSizeAtBoutStart: 3,
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const afterHuman = applyMultiplayerAction(state, {
      type: "pass-throw-in",
      playerId: "human"
    });
    expect(afterHuman.activePlayerId).toBe("bot2");

    const resolved = applyMultiplayerAction(afterHuman, {
      type: "pass-throw-in",
      playerId: "bot2"
    });

    expect(resolved.table).toEqual([]);
    expect(resolved.discard).toEqual(
      expect.arrayContaining([attack, defense])
    );
    expect(resolved.attackerId).toBe("bot");
    expect(resolved.defenderId).toBe("bot2");
    expect(resolved.activePlayerId).toBe("bot");
    expect(resolved.phase).toBe("attack");
  });

  it("lets all attackers add cards after the defender takes, then skips defender turn", () => {
    const attack = card("clubs", 7);
    const extra = card("diamonds", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [extra],
        bot: [card("hearts", 9)],
        bot2: [card("clubs", 10)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack }],
      defenderHandSizeAtBoutStart: 3,
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const taking = applyMultiplayerAction(state, {
      type: "take",
      playerId: "bot"
    });
    expect(taking.phase).toBe("taking");
    expect(taking.activePlayerId).toBe("human");

    const withExtra = applyMultiplayerAction(taking, {
      type: "play-attack",
      playerId: "human",
      cardId: extra.id
    });
    expect(withExtra.phase).toBe("taking");
    expect(withExtra.activePlayerId).toBe("bot2");

    const afterBot2Pass = applyMultiplayerAction(withExtra, {
      type: "pass-throw-in",
      playerId: "bot2"
    });
    expect(afterBot2Pass.activePlayerId).toBe("human");

    const resolved = applyMultiplayerAction(afterBot2Pass, {
      type: "pass-throw-in",
      playerId: "human"
    });

    expect(resolved.hands.bot.map((card) => card.id)).toEqual(
      expect.arrayContaining([attack.id, extra.id])
    );
    expect(resolved.attackerId).toBe("bot2");
    expect(resolved.defenderId).toBe("bot");
  });

  it("marks empty players finished after the talon is exhausted and skips them", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState({
      hands: {
        human: [],
        bot: [card("diamonds", 9)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      table: [{ attack, defense }],
      defenderHandSizeAtBoutStart: 2,
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const afterHumanPass = applyMultiplayerAction(state, {
      type: "pass-throw-in",
      playerId: "human"
    });
    const resolved = applyMultiplayerAction(afterHumanPass, {
      type: "pass-throw-in",
      playerId: "bot2"
    });

    expect(resolved.finishOrder).toContain("human");
    expect(resolved.attackerId).toBe("bot");
    expect(resolved.defenderId).toBe("bot2");
    expect(resolved.phase).toBe("attack");
  });

  it("declares the last participant with cards the fool", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState({
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
    });

    const afterHumanPass = applyMultiplayerAction(state, {
      type: "pass-throw-in",
      playerId: "human"
    });
    const resolved = applyMultiplayerAction(afterHumanPass, {
      type: "pass-throw-in",
      playerId: "bot2"
    });

    expect(resolved.phase).toBe("finished");
    expect(resolved.foolId).toBe("bot");
    expect(resolved.finishOrder).toEqual(
      expect.arrayContaining(["human", "bot2"])
    );
  });

  it("resolves a take immediately when the attack cap is already full", () => {
    const first = card("clubs", 7);
    const second = card("diamonds", 8);
    const state = makeMultiplayerState({
      hands: {
        human: [card("hearts", 11)],
        bot: [card("spades", 12), card("clubs", 13)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2,
      table: [
        { attack: first },
        { attack: second }
      ],
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const resolved = applyMultiplayerAction(state, {
      type: "take",
      playerId: "bot"
    });

    expect(resolved.table).toEqual([]);
    expect(resolved.hands.bot.map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining([first.id, second.id])
    );
    expect(resolved.phase).toBe("attack");
    expect(resolved.activePlayerId).not.toBe("bot");
  });

  it("preserves the order in which attackers empty their hands before bout resolution", () => {
    const opening = card("clubs", 7);
    const humanLast = card("spades", 8);
    const bot2Last = card("diamonds", 8);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [opening, humanLast],
          bot: [
            card("clubs", 8),
            card("diamonds", 9),
            card("spades", 9)
          ],
          bot2: [bot2Last],
          bot3: [card("hearts", 12)]
        },
        talon: [],
        trumpCard: card("hearts", 14),
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: [],
        defenderHandSizeAtBoutStart: 3,
        finishOrder: [],
        foolId: null,
        throwInCursor: 0,
        consecutivePasses: 0
      },
      4
    );

    let current = applyMultiplayerAction(state, {
      type: "play-attack",
      playerId: "human",
      cardId: opening.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: opening.id,
      cardId: "clubs-8"
    });
    current = applyMultiplayerAction(current, {
      type: "pass-throw-in",
      playerId: "human"
    });
    current = applyMultiplayerAction(current, {
      type: "play-attack",
      playerId: "bot2",
      cardId: bot2Last.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: bot2Last.id,
      cardId: "diamonds-9"
    });
    current = applyMultiplayerAction(current, {
      type: "pass-throw-in",
      playerId: "bot3"
    });
    current = applyMultiplayerAction(current, {
      type: "play-attack",
      playerId: "human",
      cardId: humanLast.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: humanLast.id,
      cardId: "spades-9"
    });
    current = applyMultiplayerAction(current, {
      type: "pass-throw-in",
      playerId: "human"
    });
    current = applyMultiplayerAction(current, {
      type: "pass-throw-in",
      playerId: "bot2"
    });
    current = applyMultiplayerAction(current, {
      type: "pass-throw-in",
      playerId: "bot3"
    });

    expect(current.finishOrder.slice(0, 2)).toEqual(["bot2", "human"]);
    expect(current.phase).toBe("attack");
    expect(current.attackerId).toBe("bot");
  });
});
