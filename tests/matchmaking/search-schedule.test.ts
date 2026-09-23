import { describe, expect, it } from "vitest";
import { createSearchSchedule } from "../../src/matchmaking/search-schedule";

describe("createSearchSchedule", () => {
  it.each([2, 3, 4] as const)(
    "creates %i-player reveal schedule inside the ten-second ceiling",
    (participantCount) => {
      const schedule = createSearchSchedule(424242, participantCount);

      expect(schedule.reveals).toHaveLength(participantCount - 1);
      expect(schedule.completeAtMs).toBeGreaterThanOrEqual(1_500);
      expect(schedule.completeAtMs).toBeLessThanOrEqual(9_500);

      let previous = 0;
      for (const reveal of schedule.reveals) {
        expect(reveal.revealAtMs).toBeGreaterThan(previous);
        expect(reveal.revealAtMs).toBeGreaterThan(0);
        expect(reveal.revealAtMs).toBeLessThanOrEqual(
          schedule.completeAtMs
        );
        previous = reveal.revealAtMs;
      }
    }
  );

  it("is deterministic for the same seed and table size", () => {
    expect(createSearchSchedule(77, 4)).toEqual(
      createSearchSchedule(77, 4)
    );
  });

  it("does not use one fixed fake duration for every match", () => {
    const durations = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map(
        (seed) => createSearchSchedule(seed, 4).completeAtMs
      )
    );

    expect(durations.size).toBeGreaterThan(2);
  });

  it("keeps opponent reveals at least 250ms apart", () => {
    const { reveals } = createSearchSchedule(9001, 4);
    for (let index = 1; index < reveals.length; index += 1) {
      expect(
        reveals[index]!.revealAtMs - reveals[index - 1]!.revealAtMs
      ).toBeGreaterThanOrEqual(250);
    }
  });
});
