import { describe, expect, it } from "vitest";
import type { ParticipantCount, ParticipantId } from "../../src/core/participants";
import {
  createMultiplayerMatch,
  fallbackAttackerForSeed
} from "../../src/rules/create-multiplayer-match";

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

  it("spreads no-trump fallback starters across every active seat", () => {
    const participants: readonly ParticipantId[] = [
      "human",
      "bot",
      "bot2",
      "bot3"
    ];
    const starters = new Set(
      Array.from({ length: 8 }, (_, index) =>
        fallbackAttackerForSeed(index, participants)
      )
    );

    expect(starters).toEqual(new Set(participants));
  });

  it("is deterministic for the same seed and participant count", () => {
    const a = createMultiplayerMatch(54321, 4);
    const b = createMultiplayerMatch(54321, 4);

    expect(a).toEqual(b);
  });

  it("defaults multiplayer matches to Podkidnoy", () => {
    const state = createMultiplayerMatch(101, 3);
    expect(state.variant).toBe("podkidnoy");
  });

  it("creates Perevodnoy matches explicitly", () => {
    const state = createMultiplayerMatch(101, 4, "perevodnoy");
    expect(state.variant).toBe("perevodnoy");
  });
});
