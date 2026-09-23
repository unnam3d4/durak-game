import { describe, expect, it } from "vitest";
import { toMultiplayerPlayerView } from "../../src/core/multiplayer-public-view";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("multiplayer public view", () => {
  it("exposes own hand and public counts without leaking opponent card identities", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("clubs", 6), card("diamonds", 7)],
        bot: [card("hearts", 8), card("spades", 9)],
        bot2: [card("clubs", 10)],
        bot3: []
      },
      activePlayerId: "bot"
    });

    const view = toMultiplayerPlayerView(state, "bot");
    const serialized = JSON.stringify(view);

    expect(view.ownHand.map((candidate) => candidate.id)).toEqual([
      "hearts-8",
      "spades-9"
    ]);
    expect(view.cardCounts.human).toBe(2);
    expect(view.cardCounts.bot2).toBe(1);
    expect(serialized).not.toContain("clubs-6");
    expect(serialized).not.toContain("diamonds-7");
    expect(serialized).not.toContain("clubs-10");
  });

  it("rejects a viewer who is not seated in the match", () => {
    const state = makeMultiplayerState({}, 2);
    expect(() => toMultiplayerPlayerView(state, "bot2")).toThrow(
      "Inactive participant"
    );
  });
});
