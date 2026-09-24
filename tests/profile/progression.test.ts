import { describe, expect, it } from "vitest";
import {
  levelForXp,
  levelProgress,
  rankForRating
} from "../../src/profile/progression";

describe("levelForXp", () => {
  it("starts at level 1 and increases monotonically on the release curve", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(399)).toBe(2);
    expect(levelForXp(400)).toBe(3);
    expect(levelForXp(900)).toBe(4);
  });

  it("clamps invalid negative XP to the level-1 floor", () => {
    expect(levelForXp(-500)).toBe(1);
  });
});

describe("levelProgress", () => {
  it("reports progress inside the release XP curve", () => {
    expect(levelProgress(900)).toEqual({
      level: 4,
      currentLevelXp: 900,
      nextLevelXp: 1600,
      xpIntoLevel: 0,
      xpRequired: 700,
      fraction: 0
    });

    expect(levelProgress(1250)).toMatchObject({
      level: 4,
      xpIntoLevel: 350,
      xpRequired: 700,
      fraction: 0.5
    });
  });

  it("sanitizes invalid XP", () => {
    expect(levelProgress(Number.NaN).level).toBe(1);
    expect(levelProgress(-50).xpIntoLevel).toBe(0);
  });
});

describe("rankForRating", () => {
  it("uses the exact release thresholds", () => {
    expect(rankForRating(0).id).toBe("10");
    expect(rankForRating(1099).id).toBe("10");
    expect(rankForRating(1100).id).toBe("9");
    expect(rankForRating(1299).id).toBe("8");
    expect(rankForRating(1300).id).toBe("7");
    expect(rankForRating(2050).id).toBe("candidate");
    expect(rankForRating(2200).id).toBe("master");
    expect(rankForRating(2400).id).toBe("grandmaster");
  });

  it("keeps a previous rank inside the 25-point demotion buffer", () => {
    expect(rankForRating(1280, "7").id).toBe("7");
    expect(rankForRating(1275, "7").id).toBe("7");
    expect(rankForRating(1274, "7").id).toBe("8");
  });

  it("promotes immediately and allows large drops to cross several ranks", () => {
    expect(rankForRating(1300, "8").id).toBe("7");
    expect(rankForRating(1100, "master").id).toBe("9");
  });
});
