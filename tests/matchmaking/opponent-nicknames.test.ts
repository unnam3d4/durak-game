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

  it("mixes Russian and English names with and without digits", () => {
    const names = opponentNicknamePool();
    const cyrillic = names.filter((name) => /[А-Яа-яЁё]/u.test(name));
    const latin = names.filter((name) => /[A-Za-z]/u.test(name));
    const withDigits = names.filter((name) => /\d/u.test(name));
    const withoutDigits = names.filter((name) => !/\d/u.test(name));

    expect(cyrillic.length).toBeGreaterThan(9_000);
    expect(latin.length).toBeGreaterThan(9_000);
    expect(withDigits.length).toBe(11_920);
    expect(withoutDigits.length).toBe(8_080);
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
