import { describe, expect, it } from "vitest";
import {
  INITIAL_RATING,
  validateNickname,
  type PlayerProfileV1
} from "../../src/profile/player-profile";
import {
  PLAYER_PROFILE_KEY,
  loadPlayerProfile,
  savePlayerProfile
} from "../../src/profile/profile-storage";
import { CURRENT_MULTIPLAYER_MATCH_KEY } from "../../src/save/multiplayer-match-save";
import type { KeyValueStorage } from "../../src/save/storage";

function memoryStorage(
  initial: Record<string, string> = {}
): KeyValueStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    }
  };
}

function profile(
  overrides: Partial<PlayerProfileV1> = {}
): PlayerProfileV1 {
  return {
    schemaVersion: 1,
    nickname: "Vovan_77",
    xp: 0,
    rating: INITIAL_RATING,
    matchesCompleted: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    createdAtMs: 100,
    updatedAtMs: 100,
    ...overrides
  };
}

describe("nickname validation", () => {
  it("rejects empty and too-short nicknames", () => {
    expect(validateNickname("")).toMatchObject({ ok: false });
    expect(validateNickname("ab")).toMatchObject({ ok: false });
  });

  it("trims input and accepts 3..16 Cyrillic/Latin/digit/underscore nicknames", () => {
    expect(validateNickname("  Vovan_77  ")).toEqual({
      ok: true,
      nickname: "Vovan_77"
    });
    expect(validateNickname("Игрок_123")).toEqual({
      ok: true,
      nickname: "Игрок_123"
    });
    expect(validateNickname("A234567890123456")).toMatchObject({
      ok: true
    });
  });

  it("rejects overlong or unsupported-character nicknames", () => {
    expect(validateNickname("A2345678901234567")).toMatchObject({
      ok: false
    });
    expect(validateNickname("nick-name")).toMatchObject({ ok: false });
    expect(validateNickname("nick name")).toMatchObject({ ok: false });
  });

  it("normalizes before moderation and rejects blocked patterns case-insensitively", () => {
    expect(validateNickname("FUCKer")).toMatchObject({ ok: false });
    expect(validateNickname("ｆｕｃｋ")).toMatchObject({ ok: false });
    expect(validateNickname("п_и_з_д")).toMatchObject({ ok: false });
    expect(validateNickname("sh1t")).toMatchObject({ ok: false });
  });

  it("does not reject benign overlapping names", () => {
    expect(validateNickname("assassin")).toMatchObject({ ok: true });
    expect(validateNickname("classic")).toMatchObject({ ok: true });
    expect(validateNickname("Сусанин")).toMatchObject({ ok: true });
  });
});

describe("profile storage", () => {
  it("round-trips a valid v1 profile", () => {
    const storage = memoryStorage();
    const expected = profile({ xp: 900, rating: 1376 });

    savePlayerProfile(storage, expected);

    expect(loadPlayerProfile(storage)).toEqual(expected);
  });

  it("clamps a finite negative rating to zero when loading", () => {
    const storage = memoryStorage({
      [PLAYER_PROFILE_KEY]: JSON.stringify(
        profile({ rating: -125 })
      )
    });

    expect(loadPlayerProfile(storage)?.rating).toBe(0);
  });

  it("rejects corrupt numeric profile data", () => {
    const storage = memoryStorage({
      [PLAYER_PROFILE_KEY]: JSON.stringify(
        profile({ xp: -1 })
      )
    });

    expect(loadPlayerProfile(storage)).toBeNull();
  });

  it("returns null for corrupt profile JSON without touching the current match save", () => {
    const matchPayload = "{valid-match-sentinel}";
    const storage = memoryStorage({
      [PLAYER_PROFILE_KEY]: "{broken-json",
      [CURRENT_MULTIPLAYER_MATCH_KEY]: matchPayload
    });

    expect(loadPlayerProfile(storage)).toBeNull();
    expect(storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)).toBe(
      matchPayload
    );
  });
});
