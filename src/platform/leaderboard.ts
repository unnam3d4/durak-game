import type { LeaderboardEntriesData } from "ysdk";
import type {
  LeaderboardSnapshot
} from "./game-platform";

export const RATING_LEADERBOARD_NAME = "rating";

export function leaderboardScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function toLeaderboardSnapshot(
  data: LeaderboardEntriesData
): LeaderboardSnapshot {
  return {
    entries: data.entries.map((entry) => ({
      rank: entry.rank,
      score: leaderboardScore(entry.score),
      publicName: entry.player.publicName
    })),
    userRank: data.userRank > 0 ? data.userRank : null
  };
}
