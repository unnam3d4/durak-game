import { describe, expect, it } from "vitest";
import {
  createBotPersonality
} from "../../src/controllers/multiplayer-bot-personality";

describe("createBotPersonality", () => {
  it("is stable for the same seed, seat, and skill", () => {
    expect(createBotPersonality(42, "bot2", "normal"))
      .toEqual(createBotPersonality(42, "bot2", "normal"));
  });

  it("gives different seats different profiles in the same match", () => {
    expect(createBotPersonality(42, "bot", "normal"))
      .not.toEqual(createBotPersonality(42, "bot2", "normal"));
  });

  it.each(["easy", "normal", "hard"] as const)(
    "keeps every personality factor bounded for %s",
    (skill) => {
      const p = createBotPersonality(99, "bot3", skill);
      for (const value of [
        p.aggression,
        p.riskTolerance,
        p.trumpConservation,
        p.pressure,
        p.memoryUse,
        p.reactionSpeed,
        p.mistakeTendency,
        p.transferPreference,
        p.throwInPreference,
        p.tiltTendency,
        p.quitTendency
      ]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1.5);
      }
      expect(p.quitTendency).toBeLessThanOrEqual(0.0015);
    }
  );

  it("keeps hard memory stronger and mistakes lower than easy", () => {
    const easy = createBotPersonality(55, "bot", "easy");
    const hard = createBotPersonality(55, "bot", "hard");

    expect(hard.memoryUse).toBeGreaterThan(easy.memoryUse);
    expect(hard.mistakeTendency).toBeLessThan(easy.mistakeTendency);
  });
});
