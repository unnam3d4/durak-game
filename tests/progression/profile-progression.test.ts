import { describe, expect, it } from "vitest";
import { createPlayerProfile } from "../../src/profile/player-profile";
import {
  levelForXp,
  rankForRating,
  recordMatchProgression,
  winRate
} from "../../src/progression/profile-progression";

describe("profile progression", () => {
  it("awards completion, win and placement rewards", () => {
    const profile = createPlayerProfile("Игрок_7", 1000);
    const update = recordMatchProgression(profile, {
      variant: "podkidnoy",
      participantCount: 4,
      outcome: "win",
      placement: 1
    });

    expect(update.profile.xp).toBe(55);
    expect(update.profile.coins).toBe(35);
    expect(update.profile.rating).toBe(25);
    expect(update.profile.stats.matchesPlayed).toBe(1);
    expect(update.profile.stats.wins).toBe(1);
    expect(update.profile.stats.currentStreak).toBe(1);
    expect(update.profile.stats.bestStreak).toBe(1);
    expect(update.profile.stats.byVariant.podkidnoy.wins).toBe(1);
    expect(update.profile.stats.byParticipants["4"].wins).toBe(1);
    expect(update.delta.achievementsUnlocked).toEqual([
      "first_match",
      "first_win"
    ]);
  });

  it("resets a win streak after a loss and never makes rating negative", () => {
    let profile = createPlayerProfile("Игрок_7", 1000);
    profile = recordMatchProgression(profile, {
      variant: "podkidnoy",
      participantCount: 2,
      outcome: "win",
      placement: 1
    }).profile;

    profile = recordMatchProgression(profile, {
      variant: "podkidnoy",
      participantCount: 2,
      outcome: "loss",
      placement: 2
    }).profile;

    expect(profile.stats.matchesPlayed).toBe(2);
    expect(profile.stats.losses).toBe(1);
    expect(profile.stats.currentStreak).toBe(0);
    expect(profile.stats.bestStreak).toBe(1);
    expect(profile.rating).toBe(5);

    const freshLoss = recordMatchProgression(
      createPlayerProfile("Север_7", 2000),
      {
        variant: "perevodnoy",
        participantCount: 3,
        outcome: "loss",
        placement: 3
      }
    );

    expect(freshLoss.profile.rating).toBe(0);
    expect(freshLoss.delta.rating).toBe(0);
  });

  it("grants streak milestones only once", () => {
    let profile = createPlayerProfile("Игрок_7", 1000);

    for (let i = 0; i < 3; i += 1) {
      profile = recordMatchProgression(profile, {
        variant: "podkidnoy",
        participantCount: 2,
        outcome: "win",
        placement: 1
      }).profile;
    }

    expect(profile.stats.currentStreak).toBe(3);
    expect(profile.achievements).toContain("streak_3");

    const fourth = recordMatchProgression(profile, {
      variant: "podkidnoy",
      participantCount: 2,
      outcome: "win",
      placement: 1
    });

    expect(fourth.delta.achievementsUnlocked).not.toContain("streak_3");
  });

  it("tracks Perevodnoy and participant-count stats separately", () => {
    const profile = createPlayerProfile("Игрок_7", 1000);
    const next = recordMatchProgression(profile, {
      variant: "perevodnoy",
      participantCount: 3,
      outcome: "draw"
    }).profile;

    expect(next.stats.draws).toBe(1);
    expect(next.stats.byVariant.perevodnoy.draws).toBe(1);
    expect(next.stats.byVariant.podkidnoy.played).toBe(0);
    expect(next.stats.byParticipants["3"].draws).toBe(1);
    expect(next.stats.byParticipants["2"].played).toBe(0);
  });

  it("derives level and rank from centralized balance data", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);

    expect(rankForRating(0)).toBe("10 разряд");
    expect(rankForRating(100)).toBe("9 разряд");
    expect(rankForRating(900)).toBe("1 разряд");
    expect(rankForRating(1000)).toBe("Мастер");
  });

  it("computes win rate without division errors", () => {
    const profile = createPlayerProfile("Игрок_7", 1000);
    expect(winRate(profile.stats)).toBe(0);

    const next = recordMatchProgression(profile, {
      variant: "podkidnoy",
      participantCount: 2,
      outcome: "win",
      placement: 1
    }).profile;

    expect(winRate(next.stats)).toBe(1);
  });
});
