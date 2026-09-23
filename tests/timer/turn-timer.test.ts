import { describe, expect, it } from "vitest";
import { createTurnDeadline, remainingTurnMs } from "../../src/timer/turn-timer";

describe("turn timer", () => {
  it("creates an exact 20-second deadline", () => {
    expect(createTurnDeadline(1_000)).toBe(21_000);
  });

  it("clamps remaining time at zero", () => {
    expect(remainingTurnMs(21_000, 22_000)).toBe(0);
  });

  it("returns the exact remaining milliseconds before the deadline", () => {
    expect(remainingTurnMs(21_000, 6_000)).toBe(15_000);
  });
});
