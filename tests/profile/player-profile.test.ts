import { describe, expect, it } from "vitest";
import {
  PLAYER_PROFILE_KEY,
  createPlayerProfile,
  fallbackNickname,
  loadPlayerProfile,
  nicknameValidationError,
  savePlayerProfile
} from "../../src/profile/player-profile";
import type { KeyValueStorage } from "../../src/save/storage";

function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key)
  };
}

describe("player profile", () => {
  it("normalizes and stores a valid nickname", () => {
    const storage = createMemoryStorage();
    const profile = createPlayerProfile("  Север_7  ", 1234);

    savePlayerProfile(storage, profile);
    expect(loadPlayerProfile(storage)).toEqual({
      schemaVersion: 1,
      nickname: "Север_7",
      createdAtMs: 1234
    });
  });

  it("enforces the 3-16 character nickname rule", () => {
    expect(nicknameValidationError("ab")).not.toBeNull();
    expect(nicknameValidationError("abcdefghijklmnopq")).not.toBeNull();
    expect(nicknameValidationError("Игрок123")).toBeNull();
  });

  it("allows only letters, digits and underscore", () => {
    expect(nicknameValidationError("Игрок 7")).not.toBeNull();
    expect(nicknameValidationError("Игрок-7")).not.toBeNull();
    expect(nicknameValidationError("Player_7")).toBeNull();
  });

  it("rejects basic abusive nicknames", () => {
    expect(nicknameValidationError("хуевый")).not.toBeNull();
    expect(nicknameValidationError("fuck777")).not.toBeNull();
  });

  it("drops a corrupt persisted profile", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      PLAYER_PROFILE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        nickname: "x",
        createdAtMs: 100
      })
    );

    expect(loadPlayerProfile(storage)).toBeNull();
    expect(storage.getItem(PLAYER_PROFILE_KEY)).toBeNull();
  });

  it("returns a stable safe fallback nickname for a seed", () => {
    expect(fallbackNickname(5)).toBe(fallbackNickname(5));
    expect(nicknameValidationError(fallbackNickname(5))).toBeNull();
  });
});
