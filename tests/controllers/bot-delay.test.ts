import { describe, expect, it } from "vitest";
import {
  botReadabilityFloorMs,
  computeBotDelayMs
} from "../../src/controllers/bot-delay";

describe("bot delay", () => {
  it("keeps obvious decisions readable instead of instant", () => {
    const value = computeBotDelayMs(
      { legalActionCount: 1, complexity: 0, reactionSpeed: 0.7 },
      () => 0.5
    );

    expect(value).toBeGreaterThanOrEqual(700);
    expect(value).toBeLessThanOrEqual(1500);
  });

  it("never exceeds the 3.5 second ceiling", () => {
    expect(
      computeBotDelayMs(
        { legalActionCount: 12, complexity: 1, reactionSpeed: 0 },
        () => 0.999999
      )
    ).toBeLessThanOrEqual(3500);
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
    expect(value).toBeLessThanOrEqual(3500);
  });

  it("leaves a readable beat after a covered bout", () => {
    expect(
      botReadabilityFloorMs({
        phase: "throw-in",
        participantCount: 2,
        tableCardCount: 2,
        uncoveredAttackCount: 0
      })
    ).toBeGreaterThanOrEqual(1100);

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
    ).toBeGreaterThanOrEqual(850);
  });

  it("makes a fast personality faster for the same position", () => {
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
