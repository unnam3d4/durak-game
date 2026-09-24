import { describe, expect, it } from "vitest";
import {
  botReadabilityFloorMs,
  computeBotDelayMs
} from "../../src/controllers/bot-delay";

describe("bot delay", () => {
  it("keeps obvious decisions in the fast band", () => {
    expect(
      computeBotDelayMs(
        { legalActionCount: 1, complexity: 0, reactionSpeed: 0.7 },
        () => 0.5
      )
    ).toBeLessThanOrEqual(1200);
  });

  it("never exceeds 15 seconds", () => {
    expect(
      computeBotDelayMs(
        { legalActionCount: 12, complexity: 1, reactionSpeed: 0 },
        () => 0.999999
      )
    ).toBeLessThanOrEqual(15000);
  });

  it("clamps out-of-range complexity", () => {
    const value = computeBotDelayMs(
      { legalActionCount: 100, complexity: 9, reactionSpeed: 0 },
      () => 1
    );
    expect(value).toBe(15000);
  });

  it("keeps a readable pause before a covered two-player bout ends", () => {
    expect(
      botReadabilityFloorMs({
        phase: "throw-in",
        participantCount: 2,
        tableCardCount: 2,
        uncoveredAttackCount: 0
      })
    ).toBeGreaterThanOrEqual(1000);

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
