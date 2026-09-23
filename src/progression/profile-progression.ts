import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import type { ParticipantCount } from "../core/participants";
import {
  PROGRESSION_BALANCE,
  RANK_TIERS,
  type RankLabel
} from "../data/progression-balance";
import type {
  MatchStatsBucket,
  PlayerProfile,
  PlayerStats
} from "../profile/player-profile";

export type MatchOutcome = "win" | "loss" | "draw";

export type ProfileMatchSummary = Readonly<{
  variant: MultiplayerVariant;
  participantCount: ParticipantCount;
  outcome: MatchOutcome;
  placement?: number;
}>;

export type ProgressionDelta = Readonly<{
  xp: number;
  coins: number;
  rating: number;
  achievementsUnlocked: readonly string[];
}>;

export type ProgressionUpdate = Readonly<{
  profile: PlayerProfile;
  delta: ProgressionDelta;
}>;

function updateBucket(
  bucket: MatchStatsBucket,
  outcome: MatchOutcome
): MatchStatsBucket {
  return {
    played: bucket.played + 1,
    wins: bucket.wins + (outcome === "win" ? 1 : 0),
    losses: bucket.losses + (outcome === "loss" ? 1 : 0),
    draws: bucket.draws + (outcome === "draw" ? 1 : 0)
  };
}

function participantKey(
  participantCount: ParticipantCount
): "2" | "3" | "4" {
  return String(participantCount) as "2" | "3" | "4";
}

function placementReward(
  table:
    | typeof PROGRESSION_BALANCE.placementXp
    | typeof PROGRESSION_BALANCE.placementCoins,
  participantCount: ParticipantCount,
  placement: number | undefined
): number {
  if (
    placement === undefined ||
    !Number.isInteger(placement) ||
    placement < 1 ||
    placement > participantCount
  ) {
    return 0;
  }

  const rewards = table[participantKey(participantCount)];
  return rewards[placement - 1] ?? 0;
}

function updateStats(
  stats: PlayerStats,
  summary: ProfileMatchSummary
): PlayerStats {
  const currentStreak =
    summary.outcome === "win" ? stats.currentStreak + 1 : 0;
  const key = participantKey(summary.participantCount);

  return {
    matchesPlayed: stats.matchesPlayed + 1,
    wins: stats.wins + (summary.outcome === "win" ? 1 : 0),
    losses: stats.losses + (summary.outcome === "loss" ? 1 : 0),
    draws: stats.draws + (summary.outcome === "draw" ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    byVariant: {
      ...stats.byVariant,
      [summary.variant]: updateBucket(
        stats.byVariant[summary.variant],
        summary.outcome
      )
    },
    byParticipants: {
      ...stats.byParticipants,
      [key]: updateBucket(
        stats.byParticipants[key],
        summary.outcome
      )
    }
  };
}

function achievementCandidates(stats: PlayerStats): readonly string[] {
  const result: string[] = [];

  if (stats.matchesPlayed >= 1) result.push("first_match");
  if (stats.wins >= 1) result.push("first_win");
  if (stats.currentStreak >= 3) result.push("streak_3");
  if (stats.currentStreak >= 5) result.push("streak_5");
  if (stats.currentStreak >= 10) result.push("streak_10");
  if (stats.matchesPlayed >= 10) result.push("matches_10");

  return result;
}

export function levelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(safeXp / PROGRESSION_BALANCE.xpPerLevel) + 1;
}

export function rankForRating(rating: number): RankLabel {
  const safeRating = Math.max(0, Math.floor(rating));
  return (
    RANK_TIERS.find((tier) => safeRating >= tier.minRating) ??
    RANK_TIERS[RANK_TIERS.length - 1]
  ).label;
}

export function winRate(stats: PlayerStats): number {
  if (stats.matchesPlayed === 0) return 0;
  return stats.wins / stats.matchesPlayed;
}

export function recordMatchProgression(
  profile: PlayerProfile,
  summary: ProfileMatchSummary
): ProgressionUpdate {
  const nextStats = updateStats(profile.stats, summary);
  const reachedStreakMilestone =
    summary.outcome === "win" &&
    PROGRESSION_BALANCE.streakMilestones.includes(
      nextStats.currentStreak as 3 | 5 | 10
    );

  const xp =
    PROGRESSION_BALANCE.xpMatchComplete +
    (summary.outcome === "win"
      ? PROGRESSION_BALANCE.xpWinBonus
      : summary.outcome === "draw"
        ? PROGRESSION_BALANCE.xpDrawBonus
        : 0) +
    (reachedStreakMilestone
      ? PROGRESSION_BALANCE.xpStreakMilestoneBonus
      : 0) +
    placementReward(
      PROGRESSION_BALANCE.placementXp,
      summary.participantCount,
      summary.placement
    );

  const coins =
    PROGRESSION_BALANCE.coinsMatchComplete +
    (summary.outcome === "win"
      ? PROGRESSION_BALANCE.coinsWinBonus
      : summary.outcome === "draw"
        ? PROGRESSION_BALANCE.coinsDrawBonus
        : 0) +
    (reachedStreakMilestone
      ? PROGRESSION_BALANCE.coinsStreakMilestoneBonus
      : 0) +
    placementReward(
      PROGRESSION_BALANCE.placementCoins,
      summary.participantCount,
      summary.placement
    );

  const requestedRatingDelta =
    summary.outcome === "win"
      ? PROGRESSION_BALANCE.ratingWin
      : summary.outcome === "loss"
        ? PROGRESSION_BALANCE.ratingLoss
        : PROGRESSION_BALANCE.ratingDraw;
  const nextRating = Math.max(
    0,
    profile.rating + requestedRatingDelta
  );
  const rating = nextRating - profile.rating;

  const existingAchievements = new Set(profile.achievements);
  const unlocked = achievementCandidates(nextStats).filter(
    (achievement) => !existingAchievements.has(achievement)
  );
  const achievements = [
    ...profile.achievements,
    ...unlocked
  ];

  return {
    profile: {
      ...profile,
      xp: profile.xp + xp,
      rating: nextRating,
      coins: profile.coins + coins,
      stats: nextStats,
      achievements
    },
    delta: {
      xp,
      coins,
      rating,
      achievementsUnlocked: unlocked
    }
  };
}
