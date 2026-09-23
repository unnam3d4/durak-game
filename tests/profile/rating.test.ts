import { describe, expect, it } from "vitest";
import { calculateRatingDelta } from "../../src/profile/rating";

describe("calculateRatingDelta", () => {
  it("uses release K=24 for an equal two-player match", () => {
    expect(
      calculateRatingDelta({
        playerRating: 1000,
        placement: 1,
        participantCount: 2,
        opponentRatings: [1000]
      })
    ).toBe(12);

    expect(
      calculateRatingDelta({
        playerRating: 1000,
        placement: 2,
        participantCount: 2,
        opponentRatings: [1000]
      })
    ).toBe(-12);
  });

  it("rewards beating a stronger opponent more than a weaker one", () => {
    const stronger = calculateRatingDelta({
      playerRating: 1000,
      placement: 1,
      participantCount: 2,
      opponentRatings: [1400]
    });
    const weaker = calculateRatingDelta({
      playerRating: 1000,
      placement: 1,
      participantCount: 2,
      opponentRatings: [900]
    });

    expect(stronger).toBeGreaterThan(weaker);
    expect(weaker).toBeGreaterThan(0);
  });

  it("scores middle placements without depending on opponent seat order", () => {
    const firstOrder = calculateRatingDelta({
      playerRating: 1000,
      placement: 2,
      participantCount: 3,
      opponentRatings: [900, 1100]
    });
    const reversed = calculateRatingDelta({
      playerRating: 1000,
      placement: 2,
      participantCount: 3,
      opponentRatings: [1100, 900]
    });

    expect(firstOrder).toBe(reversed);
    expect(firstOrder).toBe(0);
  });

  it("makes last place lose rating", () => {
    expect(
      calculateRatingDelta({
        playerRating: 1500,
        placement: 4,
        participantCount: 4,
        opponentRatings: [1400, 1500, 1600]
      })
    ).toBeLessThan(0);
  });

  it("clamps extreme multiplayer changes to the release range", () => {
    expect(
      calculateRatingDelta({
        playerRating: 800,
        placement: 1,
        participantCount: 4,
        opponentRatings: [2400, 2400, 2400]
      })
    ).toBe(32);

    expect(
      calculateRatingDelta({
        playerRating: 2400,
        placement: 4,
        participantCount: 4,
        opponentRatings: [800, 800, 800]
      })
    ).toBe(-32);
  });

  it("rejects inconsistent participant/result input", () => {
    expect(() =>
      calculateRatingDelta({
        playerRating: 1000,
        placement: 3,
        participantCount: 2,
        opponentRatings: [1000]
      })
    ).toThrow();

    expect(() =>
      calculateRatingDelta({
        playerRating: 1000,
        placement: 1,
        participantCount: 3,
        opponentRatings: [1000]
      })
    ).toThrow();
  });
});
