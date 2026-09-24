import { describe, expect, it } from "vitest";
import {
  leaderboardScore,
  toLeaderboardSnapshot
} from "../../src/platform/leaderboard";
import type { LeaderboardEntriesData } from "ysdk";

describe("leaderboard helpers", () => {
  it("sends only nonnegative integer rating scores", () => {
    expect(leaderboardScore(1376.6)).toBe(1377);
    expect(leaderboardScore(-20)).toBe(0);
    expect(leaderboardScore(Number.NaN)).toBe(0);
  });

  it("maps only SDK-provided users and treats absent user rank as null", () => {
    const data = {
      entries: [
        {
          rank: 1,
          score: 2401,
          formattedScore: "2401",
          player: {
            lang: "ru",
            publicName: "Real_Player",
            scopePermissions: {
              avatar: "allow",
              public_name: "allow"
            },
            uniqueID: "u1",
            getAvatarSrc: () => "",
            getAvatarSrcSet: () => ""
          }
        }
      ],
      leaderboard: {} as LeaderboardEntriesData["leaderboard"],
      ranges: [],
      userRank: 0
    } satisfies LeaderboardEntriesData;

    expect(toLeaderboardSnapshot(data)).toEqual({
      entries: [
        {
          rank: 1,
          score: 2401,
          publicName: "Real_Player"
        }
      ],
      userRank: null
    });
  });
});
