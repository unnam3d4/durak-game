import { describe, expect, it } from "vitest";
import {
  SAFE_OPPONENT_NICKNAME_COUNT,
  opponentNicknamePool,
  safeOpponentNickname
} from "../../src/matchmaking/opponent-nicknames";

describe("opponent nickname catalog", () => {
  it("provides twenty thousand deterministic unique safe names", () => {
    expect(SAFE_OPPONENT_NICKNAME_COUNT).toBe(20_000);
    const names = opponentNicknamePool();
    expect(names).toHaveLength(20_000);
    expect(new Set(names).size).toBe(20_000);
    expect(Math.max(...names.map((name) => name.length))).toBeLessThanOrEqual(16);
  });

  it("mixes visibly different nickname styles", () => {
    const names = opponentNicknamePool();
    const cyrillic = names.filter((name) => /[А-Яа-яЁё]/u.test(name));
    const latin = names.filter((name) => /[A-Za-z]/u.test(name));
    const withDigits = names.filter((name) => /\d/u.test(name));
    const withSeparator = names.filter((name) => name.includes("_"));
    const withoutDigits = names.filter((name) => !/\d/u.test(name));

    expect(cyrillic).toHaveLength(10_000);
    expect(latin).toHaveLength(10_000);
    expect(withDigits.length).toBeGreaterThan(10_000);
    expect(withSeparator.length).toBeGreaterThan(5_000);
    expect(withoutDigits.length).toBeGreaterThan(7_000);
    expect(names).toContain("Артём");
    expect(names).toContain("Fox");
    expect(names).toContain("AlexFox");
    expect(names).toContain("Артём_Лис");
  });

  it("cycles through different formats at adjacent style indexes", () => {
    expect(opponentNicknamePool(8)).toEqual([
      "Артём",
      "Alex",
      "Лис",
      "Fox",
      "АртёмЛис",
      "AlexFox",
      "Артём_Лис",
      "Alex_Fox"
    ]);
  });

  it("wraps deterministically without unsafe punctuation", () => {
    expect(safeOpponentNickname(42)).toBe(
      safeOpponentNickname(20_000 + 42)
    );
    expect(safeOpponentNickname(42)).toMatch(
      /^[A-Za-zА-Яа-яЁё0-9_]+$/u
    );
  });
});
