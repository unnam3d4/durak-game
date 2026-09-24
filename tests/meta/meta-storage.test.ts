import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "../../src/save/storage";
import {
  PLAYER_META_KEY,
  loadOrCreatePlayerMeta,
  loadPlayerMeta,
  savePlayerMeta
} from "../../src/meta/meta-storage";
import { createDefaultPlayerMeta } from "../../src/meta/player-meta";

function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
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

describe("player meta storage", () => {
  it("round-trips valid meta", () => {
    const storage = memoryStorage();
    const meta = {
      ...createDefaultPlayerMeta(10),
      coins: 150
    };

    savePlayerMeta(storage, meta);

    expect(loadPlayerMeta(storage)).toEqual(meta);
  });

  it("ignores corrupt meta without deleting unrelated profile data", () => {
    const storage = memoryStorage();
    storage.setItem(PLAYER_META_KEY, "{broken");
    storage.setItem("durak.playerProfile.v1", "profile");

    expect(loadPlayerMeta(storage)).toBeNull();
    expect(storage.getItem("durak.playerProfile.v1")).toBe("profile");
  });

  it("creates defaults when no meta has been saved", () => {
    const storage = memoryStorage();

    expect(loadOrCreatePlayerMeta(storage, 123)).toEqual(
      createDefaultPlayerMeta(123)
    );
  });
});
