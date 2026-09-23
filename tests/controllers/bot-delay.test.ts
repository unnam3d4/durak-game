import { describe, expect, it } from "vitest";
import { computeBotDelayMs } from "../../src/controllers/bot-delay";

describe("bot delay", () => {
  it("keeps obvious decisions in the fast band", () => {
    expect(computeBotDelayMs({ legalActionCount: 1, complexity: 0 }, () => 0.5)).toBeLessThanOrEqual(1200);
  });

  it("never exceeds 15 seconds", () => {
    expect(computeBotDelayMs({ legalActionCount: 12, complexity: 1 }, () => 0.999999)).toBeLessThanOrEqual(15000);
  });

  it("clamps out-of-range complexity", () => {
    const value = computeBotDelayMs({ legalActionCount: 100, complexity: 9 }, () => 1);
    expect(value).toBe(15000);
  });
});
