import { describe, expect, it } from "vitest";
import {
  multiplayerCardInvariantHolds,
  simulateMultiplayerMatch
} from "../../src/controllers/multiplayer-simulation-controller";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";

function expectTerminalPlacementConsistent(
  state: Awaited<ReturnType<typeof simulateMultiplayerMatch>>["finalState"]
) {
  expect(state.phase).toBe("finished");
  expect(new Set(state.finishOrder).size).toBe(state.finishOrder.length);
  expect(state.boutFinishOrder).toEqual([]);

  for (const participantId of state.finishOrder) {
    expect(state.participants).toContain(participantId);
    expect(state.hands[participantId]).toHaveLength(0);
  }

  if (state.foolId === null) {
    expect(state.finishOrder).toHaveLength(state.participants.length);
    for (const participantId of state.participants) {
      expect(state.hands[participantId]).toHaveLength(0);
    }
  } else {
    expect(state.finishOrder).not.toContain(state.foolId);
    expect(state.finishOrder).toHaveLength(state.participants.length - 1);
    expect(state.hands[state.foolId].length).toBeGreaterThan(0);
  }
}

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

        expect(
          result.terminated,
          `seed=${seed}, players=${participantCount}, actions=${result.actions}, phase=${result.finalState.phase}, active=${result.finalState.activePlayerId}`
        ).toBe(true);
        expect(result.actions).toBeLessThanOrEqual(3000);
        expect(result.illegalActionCount).toBe(0);
        expect(result.cardInvariantOk).toBe(true);
        expect(
          result.finalState.foolId === null ||
          result.finalState.participants.includes(result.finalState.foolId)
        ).toBe(true);
        expectTerminalPlacementConsistent(result.finalState);
      }
    },
    30_000
  );

  it.each(["easy", "normal", "hard"] as const)(
    "completes 3- and 4-player matches with real %s bots",
    async (skill) => {
      for (const participantCount of [3, 4] as const) {
        for (let seed = 1; seed <= 200; seed += 1) {
          const result = await simulateMultiplayerMatch(
            seed,
            participantCount,
            3000,
            skill
          );

          expect(
          result.terminated,
          `seed=${seed}, players=${participantCount}, actions=${result.actions}, phase=${result.finalState.phase}, active=${result.finalState.activePlayerId}`
        ).toBe(true);
          expect(result.illegalActionCount).toBe(0);
          expect(result.cardInvariantOk).toBe(true);
          expectTerminalPlacementConsistent(result.finalState);
        }
      }
    },
    30_000
  );
});
