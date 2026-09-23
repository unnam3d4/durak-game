import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/controllers/simulation-controller";

describe("1v1 Podkidnoy simulation", () => {
  it("completes 5000 deterministic matches without deadlock or card duplication", async () => {
    for (let seed = 1; seed <= 5000; seed += 1) {
      const result = await simulateMatch(seed, { maxActions: 1000 });
      expect(result.terminated).toBe(true);
      expect(result.actions).toBeLessThanOrEqual(1000);
      expect(result.cardInvariantOk).toBe(true);
      expect(result.illegalActionCount).toBe(0);
    }
  }, 30_000);
  it("completes deterministic matches for every bot skill without illegal actions", async () => {
    for (const skill of ["easy", "normal", "hard"] as const) {
      for (let seed = 1; seed <= 300; seed += 1) {
        const result = await simulateMatch(seed, {
          maxActions: 1000,
          humanSkill: skill,
          botSkill: skill
        });
        expect(result.terminated).toBe(true);
        expect(result.cardInvariantOk).toBe(true);
        expect(result.illegalActionCount).toBe(0);
      }
    }
  }, 30_000);
});
