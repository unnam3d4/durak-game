import { describe, expect, it } from "vitest";
import type { Card } from "../../src/core/cards";
import type { MultiplayerGameState } from "../../src/core/multiplayer-game-types";
import { applyParticipantSurrender } from "../../src/rules/multiplayer-surrender";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

function physicalIds(state: MultiplayerGameState): string[] {
  const forfeitPile =
    "forfeitPile" in state
      ? ((state as MultiplayerGameState & { forfeitPile: readonly Card[] }).forfeitPile)
      : [];
  return [
    ...state.participants.flatMap((id) => state.hands[id]),
    ...state.talon,
    ...state.discard,
    ...state.table.flatMap((pair) => [
      pair.attack,
      ...(pair.defense ? [pair.defense] : [])
    ]),
    ...forfeitPile
  ].map((card) => card.id);
}

describe("applyParticipantSurrender", () => {
  it("ends a two-player match with the surrendering participant as fool", () => {
    const before = makeMultiplayerState(
      {
        attackerId: "bot",
        defenderId: "human",
        activePlayerId: "bot",
        phase: "attack",
        table: []
      },
      2
    );

    const after = applyParticipantSurrender(before, "bot");

    expect(after.phase).toBe("finished");
    expect(after.foolId).toBe("bot");
    expect(after.finishOrder).toContain("human");
    expect(after.hands.bot).toHaveLength(0);
    expect(new Set(physicalIds(after)).size).toBe(36);
  });

  it("continues a four-player match and conserves surrendered cards", () => {
    const before = makeMultiplayerState(
      {
        attackerId: "bot",
        defenderId: "bot2",
        activePlayerId: "bot",
        phase: "attack",
        table: []
      },
      4
    );
    const surrenderedIds = before.hands.bot.map((card) => card.id);

    const after = applyParticipantSurrender(before, "bot");

    expect(after.phase).toBe("attack");
    expect(after.hands.bot).toEqual([]);
    expect(
      (after as MultiplayerGameState & { forfeitOrder: readonly string[] })
        .forfeitOrder
    ).toEqual(["bot"]);
    expect(
      (after as MultiplayerGameState & { forfeitPile: readonly Card[] })
        .forfeitPile.map((card) => card.id)
    ).toEqual(surrenderedIds);
    expect(after.activePlayerId).not.toBe("bot");
    expect(after.attackerId).not.toBe("bot");
    expect(after.defenderId).not.toBe("bot");
    expect(physicalIds(after)).toHaveLength(36);
    expect(new Set(physicalIds(after)).size).toBe(36);
  });

  it("assigns the earliest surrender as fool when only one honest participant remains", () => {
    const base = makeMultiplayerState({}, 4);
    let state = makeMultiplayerState(
      {
        attackerId: "bot",
        defenderId: "bot2",
        activePlayerId: "bot",
        phase: "attack",
        table: [],
        finishOrder: ["human"],
        discard: [...base.discard, ...base.hands.human],
        hands: {
          ...base.hands,
          human: []
        }
      },
      4
    );

    state = applyParticipantSurrender(state, "bot");
    state = {
      ...state,
      attackerId: "bot2",
      defenderId: "bot3",
      activePlayerId: "bot2",
      phase: "attack",
      table: []
    };
    state = applyParticipantSurrender(state, "bot2");

    expect(state.phase).toBe("finished");
    expect(state.foolId).toBe("bot");
    expect(state.finishOrder).toEqual(["human", "bot3", "bot2"]);
    expect(new Set(physicalIds(state)).size).toBe(36);
  });
});
