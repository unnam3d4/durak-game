import { describe, expect, it } from "vitest";
import {
  applyMatchResult,
  type MatchResultSummary
} from "../../src/profile/apply-match-result";
import {
  INITIAL_RATING,
  type PlayerProfileV1
} from "../../src/profile/player-profile";

function profile(
  overrides: Partial<PlayerProfileV1> = {}
): PlayerProfileV1 {
  return {
    schemaVersion: 1,
    nickname: "Vovan_77",
    xp: 0,
    rating: INITIAL_RATING,
    matchesCompleted: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides
  };
}

function result(
  overrides: Partial<MatchResultSummary> = {}
): MatchResultSummary {
  return {
    placement: 1,
    participantCount: 2,
    opponentRatings: [1000],
    technicalLoss: false,
    surrendered: false,
    ...overrides
  };
}

describe("applyMatchResult", () => {
  it("applies a win, XP, rating, and streak exactly once to a new profile value", () => {
    const applied = applyMatchResult(profile(), result(), 5000);

    expect(applied.profile.matchesCompleted).toBe(1);
    expect(applied.profile.wins).toBe(1);
    expect(applied.profile.currentStreak).toBe(1);
    expect(applied.profile.bestStreak).toBe(1);
    expect(applied.profile.xp).toBe(100);
    expect(applied.profile.rating).toBe(1012);
    expect(applied.profile.updatedAtMs).toBe(5000);
    expect(applied.change).toMatchObject({
      before: 1000,
      after: 1012,
      delta: 12,
      xpGained: 100
    });
  });

  it("resets the current streak on a normal non-win and keeps best streak", () => {
    const applied = applyMatchResult(
      profile({
        xp: 500,
        currentStreak: 4,
        bestStreak: 6
      }),
      result({ placement: 2 }),
      5000
    );

    expect(applied.profile.matchesCompleted).toBe(1);
    expect(applied.profile.wins).toBe(0);
    expect(applied.profile.currentStreak).toBe(0);
    expect(applied.profile.bestStreak).toBe(6);
    expect(applied.change.xpGained).toBe(20);
    expect(applied.profile.xp).toBe(520);
  });

  it("grants no completion XP for a technical loss or surrender", () => {
    const technical = applyMatchResult(
      profile({ currentStreak: 3 }),
      result({ placement: 2, technicalLoss: true }),
      5000
    );
    const surrendered = applyMatchResult(
      profile({ currentStreak: 3 }),
      result({ placement: 2, surrendered: true }),
      5000
    );

    expect(technical.change.xpGained).toBe(0);
    expect(technical.profile.currentStreak).toBe(0);
    expect(technical.profile.matchesCompleted).toBe(1);
    expect(surrendered.change.xpGained).toBe(0);
    expect(surrendered.profile.currentStreak).toBe(0);
    expect(surrendered.profile.matchesCompleted).toBe(1);
  });

  it("uses release XP values for non-last middle placements", () => {
    const second = applyMatchResult(
      profile(),
      result({
        placement: 2,
        participantCount: 4,
        opponentRatings: [1000, 1000, 1000]
      }),
      5000
    );
    const third = applyMatchResult(
      profile(),
      result({
        placement: 3,
        participantCount: 4,
        opponentRatings: [1000, 1000, 1000]
      }),
      5000
    );

    expect(second.change.xpGained).toBe(60);
    expect(third.change.xpGained).toBe(35);
  });

  it("never lets rating fall below zero", () => {
    const applied = applyMatchResult(
      profile({ rating: 5 }),
      result({
        placement: 4,
        participantCount: 4,
        opponentRatings: [0, 0, 0]
      }),
      5000
    );

    expect(applied.profile.rating).toBe(0);
    expect(applied.change.after).toBe(0);
    expect(applied.change.delta).toBe(-5);
  });

  it("only raises best streak when the new streak exceeds it", () => {
    const belowBest = applyMatchResult(
      profile({ currentStreak: 2, bestStreak: 5 }),
      result(),
      5000
    );
    const newBest = applyMatchResult(
      profile({ currentStreak: 5, bestStreak: 5 }),
      result(),
      5000
    );

    expect(belowBest.profile.bestStreak).toBe(5);
    expect(newBest.profile.bestStreak).toBe(6);
  });
});
