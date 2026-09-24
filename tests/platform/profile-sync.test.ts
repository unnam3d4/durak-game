import { describe, expect, it, vi } from "vitest";
import type { GamePlatform } from "../../src/platform/game-platform";
import {
  chooseNewerProfile,
  syncPlayerProfile
} from "../../src/platform/profile-sync";
import type { PlayerProfileV1 } from "../../src/profile/player-profile";
import { loadPlayerProfile } from "../../src/profile/profile-storage";

function profile(
  updatedAtMs: number,
  rating: number
): PlayerProfileV1 {
  return {
    schemaVersion: 1,
    nickname: "Vovan_77",
    xp: 100,
    rating,
    matchesCompleted: 1,
    wins: 1,
    currentStreak: 1,
    bestStreak: 1,
    createdAtMs: 1,
    updatedAtMs
  };
}

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

describe("profile sync", () => {
  it("chooses the profile with the newer update timestamp", () => {
    expect(chooseNewerProfile(profile(10, 1000), profile(20, 1200)))
      .toEqual(profile(20, 1200));
    expect(chooseNewerProfile(profile(30, 1300), profile(20, 1200)))
      .toEqual(profile(30, 1300));
  });

  it("persists the chosen valid profile locally and to cloud", async () => {
    const storage = memoryStorage();
    const local = profile(10, 1000);
    const cloud = profile(20, 1200);
    const saveCloudProfile = vi.fn(async () => undefined);

    const platform = {
      kind: "yandex",
      lang: "ru",
      storage,
      isAuthorized: () => true,
      loadCloudProfile: async () => cloud,
      saveCloudProfile,
      setLeaderboardScore: async () => undefined,
      getLeaderboard: async () => null,
      showInterstitial: async () => undefined,
      authorize: async () => true,
      loadingReady: () => undefined,
      gameplayStart: () => undefined,
      gameplayStop: () => undefined,
      onPlatformPause: () => () => undefined,
      onPlatformResume: () => () => undefined
    } satisfies GamePlatform;

    const chosen = await syncPlayerProfile(platform, local);

    expect(chosen).toEqual(cloud);
    expect(loadPlayerProfile(storage)).toEqual(cloud);
    expect(saveCloudProfile).toHaveBeenCalledWith(cloud);
  });

  it("never replaces a valid local profile with a failed cloud read", async () => {
    const storage = memoryStorage();
    const local = profile(30, 1300);
    const saveCloudProfile = vi.fn(async () => undefined);

    const platform = {
      kind: "yandex",
      lang: "ru",
      storage,
      isAuthorized: () => true,
      loadCloudProfile: async () => {
        throw new Error("cloud unavailable");
      },
      saveCloudProfile,
      setLeaderboardScore: async () => undefined,
      getLeaderboard: async () => null,
      showInterstitial: async () => undefined,
      authorize: async () => true,
      loadingReady: () => undefined,
      gameplayStart: () => undefined,
      gameplayStop: () => undefined,
      onPlatformPause: () => () => undefined,
      onPlatformResume: () => () => undefined
    } satisfies GamePlatform;

    expect(await syncPlayerProfile(platform, local)).toEqual(local);
    expect(saveCloudProfile).toHaveBeenCalledWith(local);
  });
});
