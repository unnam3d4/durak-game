import { describe, expect, it, vi } from "vitest";
import type { GamePlatform } from "../../src/platform/game-platform";
import { createDefaultPlayerMeta } from "../../src/meta/player-meta";
import { loadPlayerMeta } from "../../src/meta/meta-storage";
import { syncPlayerMeta } from "../../src/platform/meta-sync";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    }
  };
}

function platform(
  cloudMeta: ReturnType<typeof createDefaultPlayerMeta> | null
): GamePlatform {
  return {
    kind: "yandex",
    lang: "ru",
    storage: memoryStorage(),
    isAuthorized: () => true,
    loadingReady: () => undefined,
    gameplayStart: () => undefined,
    gameplayStop: () => undefined,
    authorize: async () => true,
    saveCloudProfile: async () => undefined,
    loadCloudProfile: async () => null,
    saveCloudMeta: vi.fn(async () => undefined),
    loadCloudMeta: vi.fn(async () => cloudMeta),
    setLeaderboardScore: async () => undefined,
    getLeaderboard: async () => null,
    showInterstitial: async () => undefined,
    onPlatformPause: () => () => undefined,
    onPlatformResume: () => () => undefined
  };
}

describe("meta cloud sync", () => {
  it("chooses newer cloud meta and persists it locally", async () => {
    const local = {
      ...createDefaultPlayerMeta(10),
      coins: 20
    };
    const cloud = {
      ...createDefaultPlayerMeta(20),
      coins: 220
    };
    const p = platform(cloud);

    const synced = await syncPlayerMeta(p, local);

    expect(synced).toEqual(cloud);
    expect(loadPlayerMeta(p.storage)).toEqual(cloud);
    expect(p.saveCloudMeta).toHaveBeenCalledWith(cloud);
  });

  it("keeps newer local meta during stale cloud sync", async () => {
    const local = {
      ...createDefaultPlayerMeta(30),
      coins: 320
    };
    const cloud = {
      ...createDefaultPlayerMeta(20),
      coins: 220
    };
    const p = platform(cloud);

    const synced = await syncPlayerMeta(p, local);

    expect(synced).toEqual(local);
    expect(loadPlayerMeta(p.storage)).toEqual(local);
  });
});
