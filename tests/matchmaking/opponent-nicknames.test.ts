import { describe, expect, it } from "vitest";
import {
  SAFE_OPPONENT_NICKNAME_COUNT,
  opponentNicknamePool,
  safeOpponentNickname
} from "../../src/matchmaking/opponent-nicknames";

describe("opponent nickname catalog", () => {
  it("provides at least twenty thousand deterministic safe names", () => {
    expect(SAFE_OPPONENT_NICKNAME_COUNT).toBe(20_000);
    const names = opponentNicknamePool();
    expect(names).toHaveLength(20_000);
    expect(new Set(names).size).toBe(20_000);
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
