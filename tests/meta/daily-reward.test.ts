import { describe, expect, it } from "vitest";
import { createDefaultPlayerMeta } from "../../src/meta/player-meta";
import {
  canClaimDailyReward,
  claimDailyReward
} from "../../src/meta/daily-reward";

describe("daily reward", () => {
  it("can be claimed only once per UTC day", () => {
    const day = Date.UTC(2026, 8, 24, 8);
    const first = claimDailyReward(createDefaultPlayerMeta(), day);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.reward).toBe(20);
    expect(first.meta.coins).toBe(20);
    expect(canClaimDailyReward(first.meta, day)).toBe(false);
    expect(claimDailyReward(first.meta, day)).toEqual({
      ok: false,
      reason: "already-claimed"
    });
  });

  it("continues consecutive-day streaks and resets after a gap", () => {
    const day1 = Date.UTC(2026, 8, 24, 8);
    const first = claimDailyReward(createDefaultPlayerMeta(), day1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const day2 = claimDailyReward(
      first.meta,
      Date.UTC(2026, 8, 25, 8)
    );
    expect(day2.ok).toBe(true);
    if (!day2.ok) return;
    expect(day2.streak).toBe(2);
    expect(day2.reward).toBe(25);

    const afterGap = claimDailyReward(
      day2.meta,
      Date.UTC(2026, 8, 27, 8)
    );
    expect(afterGap.ok).toBe(true);
    if (!afterGap.ok) return;
    expect(afterGap.streak).toBe(1);
    expect(afterGap.reward).toBe(20);
  });
});
