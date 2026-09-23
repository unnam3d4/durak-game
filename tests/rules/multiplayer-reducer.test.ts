import { describe, expect, it } from "vitest";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { applyMultiplayerAction, applyMultiplayerTimeoutLoss } from "../../src/rules/multiplayer-reducer";
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

    const resolved = applyMultiplayerAction(state, {
      type: "pass-throw-in",
      playerId: "human"
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

    const resolved = applyMultiplayerAction(taking, {
      type: "play-attack",
      playerId: "human",
      cardId: extra.id
    });
    expect(resolved.phase).toBe("attack");
    expect(resolved.activePlayerId).toBe("bot2");

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

    const resolved = applyMultiplayerAction(state, {
      type: "pass-throw-in",
      playerId: "human"
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

    const resolved = applyMultiplayerAction(state, {
      type: "pass-throw-in",
      playerId: "human"
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
            card("spades", 9),
            card("hearts", 6)
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
        defenderHandSizeAtBoutStart: 4,
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
    expect(current.activePlayerId).toBe("human");

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

    expect(current.finishOrder.slice(0, 2)).toEqual(["bot2", "human"]);
    expect(current.phase).toBe("attack");
    expect(current.attackerId).toBe("bot");
  });

  it("keeps a player in the match when the talon refills their emptied hand", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const refill = card("diamonds", 6);
    const state = makeMultiplayerState({
      hands: {
        human: [attack],
        bot: [defense, card("hearts", 10)],
        bot2: [card("spades", 11)],
        bot3: []
      },
      talon: [refill],
      trumpCard: refill,
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 2,
      finishOrder: [],
      boutFinishOrder: []
    });

    let current = applyMultiplayerAction(state, {
      type: "play-attack",
      playerId: "human",
      cardId: attack.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: defense.id
    });

    expect(current.finishOrder).not.toContain("human");
    expect(current.boutFinishOrder).toEqual([]);
    expect(current.hands.human.map((candidate) => candidate.id)).toContain(
      refill.id
    );
  });

  it("orders a successful defender after attackers who emptied first", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState({
      hands: {
        human: [attack],
        bot: [defense],
        bot2: [card("hearts", 12)],
        bot3: []
      },
      talon: [],
      trumpCard: card("spades", 14),
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 1,
      finishOrder: [],
      boutFinishOrder: []
    });

    let current = applyMultiplayerAction(state, {
      type: "play-attack",
      playerId: "human",
      cardId: attack.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: defense.id
    });

    expect(current.phase).toBe("finished");
    expect(current.finishOrder).toEqual(["human", "bot"]);
    expect(current.foolId).toBe("bot2");
  });

  it("ends as a draw when both two-player hands empty on the final defense", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [attack],
          bot: [defense],
          bot2: [],
          bot3: []
        },
        talon: [],
        trumpCard: card("spades", 14),
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: [],
        defenderHandSizeAtBoutStart: 1,
        finishOrder: [],
        boutFinishOrder: []
      },
      2
    );

    let current = applyMultiplayerAction(state, {
      type: "play-attack",
      playerId: "human",
      cardId: attack.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: defense.id
    });

    expect(current.phase).toBe("finished");
    expect(current.foolId).toBeNull();
    expect(current.finishOrder).toEqual(["human", "bot"]);
  });

  it("auto-skips attackers who have no legal throw-in", () => {
    const opening = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 11)],
        bot: [defense, card("hearts", 13)],
        bot2: [card("spades", 8)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 14),
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2,
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const covered = applyMultiplayerAction(state, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: opening.id,
      cardId: defense.id
    });

    expect(covered.phase).toBe("throw-in");
    expect(covered.activePlayerId).toBe("bot2");
    expect(
      getMultiplayerLegalActions(covered, "bot2").some(
        (action) =>
          action.type === "play-attack" &&
          action.cardId === "spades-8"
      )
    ).toBe(true);
  });

  it("auto-resolves the final two-player defense when the attacker has no cards left", () => {
    const attack = card("clubs", 7);
    const defense = card("clubs", 8);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [attack],
          bot: [defense, card("diamonds", 12)],
          bot2: [],
          bot3: []
        },
        talon: [],
        trumpCard: card("spades", 14),
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: [],
        defenderHandSizeAtBoutStart: 2,
        finishOrder: [],
        boutFinishOrder: []
      },
      2
    );

    let current = applyMultiplayerAction(state, {
      type: "play-attack",
      playerId: "human",
      cardId: attack.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot",
      attackCardId: attack.id,
      cardId: defense.id
    });

    expect(current.phase).toBe("finished");
    expect(current.finishOrder).toEqual(["human"]);
    expect(current.foolId).toBe("bot");
  });

  it("resolves a take immediately when no attacker can add a matching rank", () => {
    const attack = card("clubs", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 11)],
        bot: [card("hearts", 12)],
        bot2: [card("spades", 13)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 14),
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack }],
      defenderHandSizeAtBoutStart: 3,
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const resolved = applyMultiplayerAction(state, {
      type: "take",
      playerId: "bot"
    });

    expect(resolved.table).toEqual([]);
    expect(resolved.hands.bot.map((candidate) => candidate.id)).toContain(
      attack.id
    );
    expect(resolved.lastTakeEvent).toEqual({
      id: state.turnNumber + 1,
      defenderId: "bot",
      cards: [attack],
      triggerAttack: attack
    });
    expect(resolved.phase).toBe("attack");
    expect(resolved.activePlayerId).toBe("bot2");
  });

  it("auto-skips a no-match attacker after Take and stops on one who can add", () => {
    const attack = card("clubs", 7);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [card("diamonds", 11)],
          bot: [card("hearts", 12)],
          bot2: [card("spades", 11)],
          bot3: [card("diamonds", 7)]
        },
        talon: [],
        trumpCard: card("hearts", 14),
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "bot",
        phase: "defend",
        table: [{ attack }],
        defenderHandSizeAtBoutStart: 3,
        throwInCursor: 0,
        consecutivePasses: 0
      },
      4
    );

    const taking = applyMultiplayerAction(state, {
      type: "take",
      playerId: "bot"
    });

    expect(taking.phase).toBe("taking");
    expect(taking.activePlayerId).toBe("bot3");
    expect(
      getMultiplayerLegalActions(taking, "bot3").some(
        (action) =>
          action.type === "play-attack" &&
          action.cardId === "diamonds-7"
      )
    ).toBe(true);
  });

  it("transfers a Perevodnoy attack to the next participant", () => {
    const opening = card("clubs", 7);
    const transfer = card("diamonds", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [card("clubs", 10)],
        bot: [transfer, card("spades", 9)],
        bot2: [
          card("clubs", 8),
          card("hearts", 9),
          card("diamonds", 10)
        ],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2,
      throwInCursor: 0,
      consecutivePasses: 0
    });

    const next = applyMultiplayerAction(state, {
      type: "transfer",
      playerId: "bot",
      cardIds: [transfer.id]
    });

    expect(next.hands.bot.map((candidate) => candidate.id)).toEqual([
      "spades-9"
    ]);
    expect(next.table.map((pair) => pair.attack.id)).toEqual([
      opening.id,
      transfer.id
    ]);
    expect(next.attackerId).toBe("bot");
    expect(next.defenderId).toBe("bot2");
    expect(next.activePlayerId).toBe("bot2");
    expect(next.defenderHandSizeAtBoutStart).toBe(3);
    expect(next.phase).toBe("defend");
    expect(next.throwInCursor).toBe(0);
  });

  it("supports chained Perevodnoy transfers around the table", () => {
    const opening = card("clubs", 7);
    const firstTransfer = card("diamonds", 7);
    const secondTransfer = card("hearts", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [
          card("clubs", 10),
          card("spades", 11),
          card("diamonds", 12)
        ],
        bot: [firstTransfer, card("spades", 9)],
        bot2: [secondTransfer, card("clubs", 8), card("hearts", 9)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2
    });

    const first = applyMultiplayerAction(state, {
      type: "transfer",
      playerId: "bot",
      cardIds: [firstTransfer.id]
    });
    const second = applyMultiplayerAction(first, {
      type: "transfer",
      playerId: "bot2",
      cardIds: [secondTransfer.id]
    });

    expect(second.table.map((pair) => pair.attack.id)).toEqual([
      opening.id,
      firstTransfer.id,
      secondTransfer.id
    ]);
    expect(second.attackerId).toBe("bot2");
    expect(second.defenderId).toBe("human");
    expect(second.activePlayerId).toBe("human");
    expect(second.defenderHandSizeAtBoutStart).toBe(3);
    expect(second.phase).toBe("defend");
  });

  it("swaps attack and defense roles on a two-player transfer", () => {
    const opening = card("clubs", 7);
    const transfer = card("diamonds", 7);
    const state = makeMultiplayerState(
      {
        variant: "perevodnoy",
        hands: {
          human: [card("clubs", 10), card("spades", 11)],
          bot: [transfer, card("spades", 9)],
          bot2: [],
          bot3: []
        },
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "bot",
        phase: "defend",
        table: [{ attack: opening }],
        defenderHandSizeAtBoutStart: 2
      },
      2
    );

    const next = applyMultiplayerAction(state, {
      type: "transfer",
      playerId: "bot",
      cardIds: [transfer.id]
    });

    expect(next.attackerId).toBe("bot");
    expect(next.defenderId).toBe("human");
    expect(next.activePlayerId).toBe("human");
    expect(next.table).toHaveLength(2);
  });

  it("records a player who transfers their last card as finished after the bout", () => {
    const opening = card("clubs", 7);
    const transfer = card("diamonds", 7);
    const defenseOne = card("clubs", 8);
    const defenseTwo = card("diamonds", 8);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [card("spades", 10)],
        bot: [transfer],
        bot2: [defenseOne, defenseTwo, card("hearts", 11)],
        bot3: []
      },
      talon: [],
      trumpCard: card("hearts", 14),
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 1,
      finishOrder: [],
      boutFinishOrder: []
    });

    let current = applyMultiplayerAction(state, {
      type: "transfer",
      playerId: "bot",
      cardIds: [transfer.id]
    });

    expect(current.boutFinishOrder).toEqual(["bot"]);

    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot2",
      attackCardId: opening.id,
      cardId: defenseOne.id
    });
    current = applyMultiplayerAction(current, {
      type: "play-defense",
      playerId: "bot2",
      attackCardId: transfer.id,
      cardId: defenseTwo.id
    });

    expect(current.finishOrder).toContain("bot");
    expect(current.boutFinishOrder).toEqual([]);
    expect(current.hands.bot).toEqual([]);
  });

  it("transfers several matching cards in one Perevodnoy action", () => {
    const opening = card("clubs", 7);
    const first = card("diamonds", 7);
    const second = card("hearts", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [card("clubs", 10)],
        bot: [first, second, card("spades", 9)],
        bot2: [
          card("clubs", 8),
          card("diamonds", 9),
          card("hearts", 10)
        ],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "bot",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 3
    });

    const next = applyMultiplayerAction(state, {
      type: "transfer",
      playerId: "bot",
      cardIds: [second.id, first.id]
    });

    expect(next.hands.bot.map((candidate) => candidate.id)).toEqual([
      "spades-9"
    ]);
    expect(next.table.map((pair) => pair.attack.id)).toEqual([
      opening.id,
      first.id,
      second.id
    ]);
    expect(next.attackerId).toBe("bot");
    expect(next.defenderId).toBe("bot2");
    expect(next.activePlayerId).toBe("bot2");
    expect(next.defenderHandSizeAtBoutStart).toBe(3);
  });
  it("marks the active human as technical loser without auto-playing a card", () => {
    const state = makeMultiplayerState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    const next = applyMultiplayerTimeoutLoss(state, "human");

    expect(next.phase).toBe("finished");
    expect(next.foolId).toBe("human");
    expect(next.technicalLossId).toBe("human");
    expect(next.hands.human).toEqual(state.hands.human);
    expect(next.table).toEqual(state.table);
    expect(next.turnNumber).toBe(state.turnNumber + 1);
  });

});
