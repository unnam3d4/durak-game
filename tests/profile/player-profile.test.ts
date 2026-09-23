import { describe, expect, it } from "vitest";
import { createDefaultCosmeticInventory } from "../../src/data/cosmetics";
import {
  LEGACY_PLAYER_PROFILE_KEY,
  LEGACY_V2_PROFILE_KEY,
  PLAYER_PROFILE_KEY,
  createEmptyPlayerStats,
  createPlayerProfile,
  fallbackNickname,
  loadPlayerProfile,
  nicknameValidationError,
  renamePlayerProfile,
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
  it("normalizes and stores a valid nickname with progression defaults", () => {
    const storage = createMemoryStorage();
    const profile = createPlayerProfile("  Север_7  ", 1234);

    savePlayerProfile(storage, profile);
    expect(loadPlayerProfile(storage)).toEqual({
      schemaVersion: 3,
      nickname: "Север_7",
      createdAtMs: 1234,
      xp: 0,
      rating: 0,
      coins: 0,
      stats: createEmptyPlayerStats(),
      achievements: [],
      cosmetics: createDefaultCosmeticInventory()
    });
  });

  it("migrates the nickname-only v1 profile without losing identity", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      LEGACY_PLAYER_PROFILE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        nickname: "Север_7",
        createdAtMs: 1234
      })
    );

    const migrated = loadPlayerProfile(storage);

    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.nickname).toBe("Север_7");
    expect(migrated?.xp).toBe(0);
    expect(migrated?.stats.matchesPlayed).toBe(0);
    expect(migrated?.cosmetics.equipped.cardBack).toBe("back_emerald");
    expect(storage.getItem(LEGACY_PLAYER_PROFILE_KEY)).toBeNull();
    expect(storage.getItem(PLAYER_PROFILE_KEY)).not.toBeNull();
  });

  it("migrates the progression v2 profile and preserves balances", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      LEGACY_V2_PROFILE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        nickname: "Север_7",
        createdAtMs: 1234,
        xp: 180,
        rating: 125,
        coins: 90,
        stats: createEmptyPlayerStats(),
        achievements: ["first_match"]
      })
    );

    const migrated = loadPlayerProfile(storage);

    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.xp).toBe(180);
    expect(migrated?.rating).toBe(125);
    expect(migrated?.coins).toBe(90);
    expect(migrated?.achievements).toEqual(["first_match"]);
    expect(migrated?.cosmetics).toEqual(createDefaultCosmeticInventory());
    expect(storage.getItem(LEGACY_V2_PROFILE_KEY)).toBeNull();
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

  it("drops a corrupt persisted v3 profile", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      PLAYER_PROFILE_KEY,
      JSON.stringify({
        schemaVersion: 3,
        nickname: "x",
        createdAtMs: 100,
        xp: 0,
        rating: 0,
        coins: 0,
        stats: createEmptyPlayerStats(),
        achievements: [],
        cosmetics: createDefaultCosmeticInventory()
      })
    );

    expect(loadPlayerProfile(storage)).toBeNull();
    expect(storage.getItem(PLAYER_PROFILE_KEY)).toBeNull();
  });

  it("rejects internally inconsistent statistics", () => {
    const storage = createMemoryStorage();
    const profile = createPlayerProfile("Игрок_7", 100);
    storage.setItem(
      PLAYER_PROFILE_KEY,
      JSON.stringify({
        ...profile,
        stats: {
          ...profile.stats,
          matchesPlayed: 1,
          wins: 0,
          losses: 0,
          draws: 0
        }
      })
    );

    expect(loadPlayerProfile(storage)).toBeNull();
  });

  it("rejects cosmetic equipment that is not unlocked", () => {
    const storage = createMemoryStorage();
    const profile = createPlayerProfile("Игрок_7", 100);
    storage.setItem(
      PLAYER_PROFILE_KEY,
      JSON.stringify({
        ...profile,
        cosmetics: {
          unlocked: ["back_emerald", "table_emerald"],
          equipped: {
            cardBack: "back_midnight",
            tableTheme: "table_emerald"
          }
        }
      })
    );

    expect(loadPlayerProfile(storage)).toBeNull();
  });

  it("renames a player without resetting progression", () => {
    const profile = {
      ...createPlayerProfile("Север_7", 100),
      xp: 80,
      rating: 50,
      coins: 25
    };

    const renamed = renamePlayerProfile(profile, "  Новый_7  ");

    expect(renamed.nickname).toBe("Новый_7");
    expect(renamed.xp).toBe(80);
    expect(renamed.rating).toBe(50);
    expect(renamed.coins).toBe(25);
    expect(renamed.cosmetics).toEqual(profile.cosmetics);
  });

  it("returns a stable safe fallback nickname for a seed", () => {
    expect(fallbackNickname(5)).toBe(fallbackNickname(5));
    expect(nicknameValidationError(fallbackNickname(5))).toBeNull();
  });
});
