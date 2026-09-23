import { describe, expect, it } from "vitest";
import {
  botSkillForRating,
  createOpponentSeatProfiles
} from "../../src/matchmaking/opponent-profiles";

describe("opponent profiles", () => {
  it("creates one unique nickname per opponent without implementation labels", () => {
    const profiles = createOpponentSeatProfiles(12345, 4, 1376);
    const names = profiles.map((profile) => profile.nickname);

    expect(profiles).toHaveLength(3);
    expect(new Set(names).size).toBe(3);
    expect(names).not.toContain("Соперник 1");
    expect(names).not.toContain("Соперник 2");
    expect(names).not.toContain("Соперник 3");
  });

  it("keeps hidden opponent strength near the player's starting rating", () => {
    const profiles = createOpponentSeatProfiles(777, 4, 1376);

    for (const profile of profiles) {
      expect(profile.hiddenRating).toBeGreaterThanOrEqual(1196);
      expect(profile.hiddenRating).toBeLessThanOrEqual(1556);
      expect(profile.skill).toBe(
        botSkillForRating(profile.hiddenRating)
      );
    }
  });

  it("clamps generated hidden ratings to the supported balance range", () => {
    for (const profile of createOpponentSeatProfiles(3, 4, 100)) {
      expect(profile.hiddenRating).toBeGreaterThanOrEqual(800);
    }
    for (const profile of createOpponentSeatProfiles(3, 4, 4000)) {
      expect(profile.hiddenRating).toBeLessThanOrEqual(2400);
    }
  });

  it("does not expose fabricated verifiable social fields", () => {
    const [profile] = createOpponentSeatProfiles(99, 2, 1400);

    expect(profile).toBeDefined();
    expect(profile).not.toHaveProperty("globalRank");
    expect(profile).not.toHaveProperty("city");
    expect(profile).not.toHaveProperty("ping");
    expect(profile).not.toHaveProperty("online");
    expect(profile).not.toHaveProperty("matchHistory");
  });

  it("maps rating bands to bot skill consistently", () => {
    expect(botSkillForRating(1199)).toBe("easy");
    expect(botSkillForRating(1200)).toBe("normal");
    expect(botSkillForRating(1749)).toBe("normal");
    expect(botSkillForRating(1750)).toBe("hard");
  });

  it("is deterministic for the same match seed", () => {
    expect(createOpponentSeatProfiles(101, 3, 1500)).toEqual(
      createOpponentSeatProfiles(101, 3, 1500)
    );
  });
});
