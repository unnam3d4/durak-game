import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import type { ParticipantCount } from "../core/participants";
import type {
  MatchStatsBucket,
  PlayerMetaStats,
  PlayerMetaV1
} from "./player-meta";

export type MetaMatchSummary = Readonly<{
  variant: MultiplayerVariant;
  participantCount: ParticipantCount;
  placement: number;
  technicalLoss: boolean;
  surrendered: boolean;
}>;

export type MetaMatchDelta = Readonly<{
  coins: number;
  achievementsUnlocked: readonly string[];
}>;

export type AppliedMetaMatchResult = Readonly<{
  meta: PlayerMetaV1;
  delta: MetaMatchDelta;
}>;

const COIN_REWARDS: Readonly<
  Record<ParticipantCount, readonly number[]>
> = {
  2: [20, 7],
  3: [28, 14, 6],
  4: [36, 20, 10, 5]
};

function participantKey(
  count: ParticipantCount
): "2" | "3" | "4" {
  return String(count) as "2" | "3" | "4";
}

function updateBucket(
  bucket: MatchStatsBucket,
  won: boolean
): MatchStatsBucket {
  return {
    played: bucket.played + 1,
    wins: bucket.wins + (won ? 1 : 0),
    losses: bucket.losses + (won ? 0 : 1)
  };
}

function updateStats(
  stats: PlayerMetaStats,
  result: MetaMatchSummary,
  won: boolean
): PlayerMetaStats {
  const currentStreak = won ? stats.currentStreak + 1 : 0;
  const key = participantKey(result.participantCount);

  return {
    matchesPlayed: stats.matchesPlayed + 1,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
    technicalLosses:
      stats.technicalLosses + (result.technicalLoss ? 1 : 0),
    surrenders:
      stats.surrenders + (result.surrendered ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    byVariant: {
      ...stats.byVariant,
      [result.variant]: updateBucket(
        stats.byVariant[result.variant],
        won
      )
    },
    byParticipants: {
      ...stats.byParticipants,
      [key]: updateBucket(stats.byParticipants[key], won)
    }
  };
}

function achievementCandidates(
  stats: PlayerMetaStats,
  result: MetaMatchSummary,
  won: boolean
): readonly string[] {
  const ids: string[] = [];

  if (stats.matchesPlayed >= 1) ids.push("first_match");
  if (stats.wins >= 1) ids.push("first_win");
  if (stats.currentStreak >= 3) ids.push("streak_3");
  if (stats.currentStreak >= 5) ids.push("streak_5");
  if (stats.currentStreak >= 10) ids.push("streak_10");
  if (stats.matchesPlayed >= 10) ids.push("matches_10");
  if (won && result.variant === "perevodnoy") {
    ids.push("perevodnoy_win");
  }
  if (won && result.participantCount === 4) {
    ids.push("four_player_win");
  }

  return ids;
}

function coinReward(result: MetaMatchSummary): number {
  if (result.technicalLoss || result.surrendered) return 0;
  return (
    COIN_REWARDS[result.participantCount][result.placement - 1] ?? 0
  );
}

export function applyMetaMatchResult(
  meta: PlayerMetaV1,
  result: MetaMatchSummary,
  nowMs = Date.now()
): AppliedMetaMatchResult {
  const won =
    result.placement === 1 &&
    !result.technicalLoss &&
    !result.surrendered;
  const stats = updateStats(meta.stats, result, won);
  const candidates = achievementCandidates(stats, result, won);
  const unlocked = candidates.filter(
    (id) => !meta.achievements.includes(id)
  );
  const coins = coinReward(result);
  const updatedAtMs =
    Number.isFinite(nowMs) && nowMs >= 0
      ? Math.floor(nowMs)
      : meta.updatedAtMs;

  return {
    meta: {
      ...meta,
      coins: meta.coins + coins,
      stats,
      achievements: [...meta.achievements, ...unlocked],
      updatedAtMs
    },
    delta: {
      coins,
      achievementsUnlocked: unlocked
    }
  };
}
