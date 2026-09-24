import type { PlayerMetaV1 } from "./player-meta";

export const DAILY_REWARDS = [20, 25, 30, 40, 50, 70, 100] as const;

export type DailyRewardResult =
  | Readonly<{
      ok: true;
      reward: number;
      streak: number;
      meta: PlayerMetaV1;
    }>
  | Readonly<{ ok: false; reason: "already-claimed" }>;

function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function previousUtcDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function canClaimDailyReward(
  meta: PlayerMetaV1,
  nowMs = Date.now()
): boolean {
  return meta.dailyReward.lastClaimUtcDay !== utcDay(nowMs);
}

export function claimDailyReward(
  meta: PlayerMetaV1,
  nowMs = Date.now()
): DailyRewardResult {
  const today = utcDay(nowMs);
  if (meta.dailyReward.lastClaimUtcDay === today) {
    return { ok: false, reason: "already-claimed" };
  }

  const continued =
    meta.dailyReward.lastClaimUtcDay === previousUtcDay(today);
  const streak = continued
    ? Math.min(meta.dailyReward.streak + 1, DAILY_REWARDS.length)
    : 1;
  const reward = DAILY_REWARDS[streak - 1]!;

  return {
    ok: true,
    reward,
    streak,
    meta: {
      ...meta,
      coins: meta.coins + reward,
      dailyReward: {
        lastClaimUtcDay: today,
        streak
      },
      updatedAtMs: Math.max(meta.updatedAtMs, Math.floor(nowMs))
    }
  };
}
