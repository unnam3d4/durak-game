import { describe, expect, it } from "vitest";
import {
  chooseScoredAction
} from "../../src/controllers/multiplayer-bot-choice";
import { createBotPersonality } from "../../src/controllers/multiplayer-bot-personality";
import type { MultiplayerGameAction } from "../../src/rules/multiplayer-legal-actions";

const actionA: MultiplayerGameAction = {
  type: "play-attack",
  playerId: "bot",
  cardId: "clubs-7"
};
const actionB: MultiplayerGameAction = {
  type: "play-attack",
  playerId: "bot",
  cardId: "diamonds-7"
};
const actionC: MultiplayerGameAction = {
  type: "play-attack",
  playerId: "bot",
  cardId: "spades-14"
};

describe("chooseScoredAction", () => {
  it("always picks the only candidate", () => {
    const personality = createBotPersonality(42, "bot", "normal");

    expect(
      chooseScoredAction(
        [{ action: actionA, cost: 4 }],
        personality,
        () => 0.99
      )
    ).toEqual(actionA);
  });

  it("never chooses a catastrophically worse move because of randomness", () => {
    const personality = {
      ...createBotPersonality(42, "bot", "easy"),
      mistakeTendency: 0.3
    };

    const chosen = chooseScoredAction(
      [
        { action: actionA, cost: 1 },
        { action: actionB, cost: 1.3 },
        { action: actionC, cost: 9 }
      ],
      personality,
      () => 0.99
    );

    expect(chosen).not.toEqual(actionC);
  });

  it("lets an imperfect personality choose a close second-best move", () => {
    const personality = {
      ...createBotPersonality(42, "bot", "easy"),
      mistakeTendency: 0.25
    };
    const values = [0.99, 0.99];
    const chosen = chooseScoredAction(
      [
        { action: actionA, cost: 1 },
        { action: actionB, cost: 1.25 }
      ],
      personality,
      () => values.shift() ?? 0.99
    );

    expect(chosen).toEqual(actionB);
  });

  it("keeps hard play on the best move when costs are meaningfully different", () => {
    const personality = createBotPersonality(42, "bot", "hard");

    expect(
      chooseScoredAction(
        [
          { action: actionA, cost: 1 },
          { action: actionB, cost: 1.5 }
        ],
        personality,
        () => 0.99
      )
    ).toEqual(actionA);
  });
});
