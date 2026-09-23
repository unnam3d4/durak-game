import { describe, expect, it } from "vitest";
import {
  multiplayerCardInvariantHolds,
  simulateMultiplayerMatch
} from "../../src/controllers/multiplayer-simulation-controller";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";

describe("multiplayer Podkidnoy simulation", () => {
  it.each([2, 3, 4] as const)(
    "preserves all physical cards at setup for %i participants",
    (participantCount) => {
      expect(
        multiplayerCardInvariantHolds(
          createMultiplayerMatch(12345, participantCount)
        )
      ).toBe(true);
    }
  );

  it.each([2, 3, 4] as const)(
    "completes deterministic %i-player matches without deadlock or card loss",
    async (participantCount) => {
      for (let seed = 1; seed <= 500; seed += 1) {
        const result = await simulateMultiplayerMatch(
          seed,
          participantCount,
          3000
        );

        expect(result.terminated).toBe(true);
        expect(result.actions).toBeLessThanOrEqual(3000);
        expect(result.illegalActionCount).toBe(0);
        expect(result.cardInvariantOk).toBe(true);
        expect(
          result.finalState.foolId === null ||
          result.finalState.participants.includes(result.finalState.foolId)
        ).toBe(true);
      }
    },
    30_000
  );
});
