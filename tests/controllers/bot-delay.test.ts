import { describe, expect, it } from "vitest";
import {
  botReadabilityFloorMs,
  computeBotDelayMs
} from "../../src/controllers/bot-delay";

describe("bot delay", () => {
  it("keeps even obvious decisions readable", () => {
    const fastest = computeBotDelayMs(
      { legalActionCount: 1, complexity: 0, reactionSpeed: 1 },
      () => 0
    );
    const middle = computeBotDelayMs(
      { legalActionCount: 1, complexity: 0, reactionSpeed: 0.7 },
      () => 0.5
    );

    expect(fastest).toBeGreaterThanOrEqual(1600);
    expect(middle).toBeGreaterThanOrEqual(3000);
  });

  it("uses a continuous random range rather than a fixed cadence", () => {
    const input = {
      legalActionCount: 4,
      complexity: 0.55,
      reactionSpeed: 0.6
    };
    const delays = [0.08, 0.29, 0.53, 0.77, 0.94].map((sample) =>
      computeBotDelayMs(input, () => sample)
    );

    expect(new Set(delays).size).toBe(delays.length);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
  });

  it("allows complex turns to take longer but never over seven seconds", () => {
    const value = computeBotDelayMs(
      { legalActionCount: 12, complexity: 1, reactionSpeed: 0 },
      () => 0.999999
    );

    expect(value).toBeGreaterThanOrEqual(6000);
    expect(value).toBeLessThanOrEqual(7000);
  });

  it("clamps out-of-range complexity", () => {
    const value = computeBotDelayMs(
      { legalActionCount: 100, complexity: 9, reactionSpeed: 0 },
      () => 1
    );
    const clamped = computeBotDelayMs(
      { legalActionCount: 100, complexity: 1, reactionSpeed: 0 },
      () => 1
    );

    expect(value).toBe(clamped);
    expect(value).toBeLessThanOrEqual(7000);
  });

  it("leaves a readable beat after a covered bout", () => {
    expect(
      botReadabilityFloorMs({
        phase: "throw-in",
        participantCount: 2,
        tableCardCount: 2,
        uncoveredAttackCount: 0
      })
    ).toBeGreaterThanOrEqual(2000);

    expect(
      botReadabilityFloorMs({
        phase: "throw-in",
        participantCount: 4,
        tableCardCount: 2,
        uncoveredAttackCount: 0
      })
    ).toBeLessThan(
      botReadabilityFloorMs({
        phase: "throw-in",
        participantCount: 2,
        tableCardCount: 2,
        uncoveredAttackCount: 0
      })
    );
  });

  it("keeps defense turns from flashing by too quickly", () => {
    expect(
      botReadabilityFloorMs({
        phase: "defend",
        participantCount: 3,
        tableCardCount: 1,
        uncoveredAttackCount: 1
      })
    ).toBeGreaterThanOrEqual(1800);
  });

  it("preserves a small personality difference inside the random range", () => {
    const fast = computeBotDelayMs(
      { legalActionCount: 5, complexity: 0.6, reactionSpeed: 0.9 },
      () => 0.5
    );
    const slow = computeBotDelayMs(
      { legalActionCount: 5, complexity: 0.6, reactionSpeed: 0.2 },
      () => 0.5
    );

    expect(fast).toBeLessThan(slow);
  });
});
