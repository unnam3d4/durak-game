import type { ParticipantCount } from "../core/participants";
import type { PlayerProfileV1 } from "./player-profile";
import { rankForRating } from "./progression";
import { calculateRatingDelta } from "./rating";

export type MatchResultSummary = Readonly<{
  placement: number;
  participantCount: ParticipantCount;
  opponentRatings: readonly number[];
  technicalLoss: boolean;
  surrendered: boolean;
}>;

export type RatingChangeSummary = Readonly<{
  before: number;
  after: number;
  delta: number;
  rankBefore: string;
  rankAfter: string;
  xpGained: number;
}>;

export type AppliedMatchResult = Readonly<{
  profile: PlayerProfileV1;
  change: RatingChangeSummary;
}>;

function xpForResult(result: MatchResultSummary): number {
  if (result.technicalLoss || result.surrendered) return 0;
  if (result.placement === 1) return 100;
  if (result.placement === result.participantCount) return 20;
  if (result.placement === 2) return 60;
  return 35;
}

export function applyMatchResult(
  profile: PlayerProfileV1,
  result: MatchResultSummary,
  nowMs = Date.now()
): AppliedMatchResult {
  const beforeRank = rankForRating(profile.rating);
  const calculatedDelta = calculateRatingDelta({
    playerRating: profile.rating,
    placement: result.placement,
    participantCount: result.participantCount,
    opponentRatings: result.opponentRatings
  });
  const afterRating = Math.max(0, profile.rating + calculatedDelta);
  const afterRank = rankForRating(afterRating, beforeRank.id);
  const xpGained = xpForResult(result);
  const won =
    result.placement === 1 &&
    !result.technicalLoss &&
    !result.surrendered;
  const currentStreak = won ? profile.currentStreak + 1 : 0;
  const updatedAtMs =
    Number.isFinite(nowMs) && nowMs >= 0 ? nowMs : profile.updatedAtMs;

  const next: PlayerProfileV1 = {
    ...profile,
    xp: profile.xp + xpGained,
    rating: afterRating,
    matchesCompleted: profile.matchesCompleted + 1,
    wins: profile.wins + (won ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(profile.bestStreak, currentStreak),
    updatedAtMs
  };

  return {
    profile: next,
    change: {
      before: profile.rating,
      after: afterRating,
      delta: afterRating - profile.rating,
      rankBefore: beforeRank.label,
      rankAfter: afterRank.label,
      xpGained
    }
  };
}
