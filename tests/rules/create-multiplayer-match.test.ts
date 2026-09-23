import { describe, expect, it } from "vitest";
import type { ParticipantCount, ParticipantId } from "../../src/core/participants";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";

function physicalCardIds(count: ParticipantCount, seed = 12345): string[] {
  const state = createMultiplayerMatch(seed, count);
  return [
    ...state.participants.flatMap((id) => state.hands[id]),
    ...state.talon
  ].map((card) => card.id);
}

describe("createMultiplayerMatch", () => {
  it.each([
    [2, 24],
    [3, 18],
    [4, 12]
  ] as const)(
    "deals six cards each for %i participants and leaves %i in the talon",
    (participantCount, talonCount) => {
      const state = createMultiplayerMatch(12345, participantCount);

      for (const participantId of state.participants) {
        expect(state.hands[participantId]).toHaveLength(6);
      }
      expect(state.talon).toHaveLength(talonCount);
      expect(state.trumpCard).toBe(state.talon.at(-1));
    }
  );

  it.each([2, 3, 4] as const)(
    "preserves all 36 physical cards exactly once with %i participants",
    (participantCount) => {
      const ids = physicalCardIds(participantCount, 999);
      expect(ids).toHaveLength(36);
      expect(new Set(ids).size).toBe(36);
    }
  );

  it("keeps inactive seats empty", () => {
    const two = createMultiplayerMatch(7, 2);
    expect(two.hands.bot2).toEqual([]);
    expect(two.hands.bot3).toEqual([]);

    const three = createMultiplayerMatch(7, 3);
    expect(three.hands.bot3).toEqual([]);
  });

  it.each([2, 3, 4] as const)(
    "assigns the first attacker to a holder of the lowest dealt trump for %i participants",
    (participantCount) => {
      for (let seed = 1; seed <= 100; seed += 1) {
        const state = createMultiplayerMatch(seed, participantCount);
        const candidates = state.participants
          .flatMap((participantId) =>
            state.hands[participantId].map((card) => ({
              participantId,
              card
            }))
          )
          .filter(({ card }) => card.suit === state.trumpCard.suit)
          .sort((a, b) => a.card.rank - b.card.rank);

        if (candidates.length > 0) {
          expect(state.attackerId).toBe(candidates[0]!.participantId);
        }
      }
    }
  );

  it("chooses the defender clockwise from the initial attacker", () => {
    const state = createMultiplayerMatch(42, 4);
    const attackerIndex = state.participants.indexOf(state.attackerId);
    const expectedDefender =
      state.participants[(attackerIndex + 1) % state.participants.length];

    expect(state.defenderId).toBe(expectedDefender);
  });

  it("does not bias no-trump fallback to one seat", () => {
    const starters = new Set<ParticipantId>();

    for (let seed = 1; seed <= 100_000 && starters.size < 4; seed += 1) {
      const state = createMultiplayerMatch(seed, 4);
      const hasDealtTrump = state.participants.some((participantId) =>
        state.hands[participantId].some(
          (card) => card.suit === state.trumpCard.suit
        )
      );
      if (!hasDealtTrump) starters.add(state.attackerId);
    }

    expect(starters.size).toBeGreaterThan(1);
  });

  it("is deterministic for the same seed and participant count", () => {
    const a = createMultiplayerMatch(54321, 4);
    const b = createMultiplayerMatch(54321, 4);

    expect(a).toEqual(b);
  });
});
