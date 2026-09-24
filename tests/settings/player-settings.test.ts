import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "../../src/save/storage";
import {
  DEFAULT_PLAYER_SETTINGS,
  PLAYER_SETTINGS_KEY,
  loadPlayerSettings,
  savePlayerSettings
} from "../../src/settings/player-settings";

function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

describe("player settings", () => {
  it("defaults sound to enabled", () => {
    expect(loadPlayerSettings(memoryStorage())).toEqual(
      DEFAULT_PLAYER_SETTINGS
    );
  });

  it("persists the sound preference", () => {
    const storage = memoryStorage();
    savePlayerSettings(storage, {
      schemaVersion: 1,
      soundEnabled: false
    });
    expect(loadPlayerSettings(storage).soundEnabled).toBe(false);
  });

  it("ignores invalid stored settings", () => {
    const storage = memoryStorage();
    storage.setItem(PLAYER_SETTINGS_KEY, "{broken");
    expect(loadPlayerSettings(storage)).toEqual(
      DEFAULT_PLAYER_SETTINGS
    );
  });
});
