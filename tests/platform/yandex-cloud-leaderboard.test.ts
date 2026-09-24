import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeGamePlatform } from "../../src/platform/yandex-games";
import type { PlayerProfileV1 } from "../../src/profile/player-profile";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function profile(overrides: Partial<PlayerProfileV1> = {}): PlayerProfileV1 {
  return {
    schemaVersion: 1,
    nickname: "Vovan_77",
    xp: 900,
    rating: 1376,
    matchesCompleted: 12,
    wins: 5,
    currentStreak: 2,
    bestStreak: 4,
    createdAtMs: 1,
    updatedAtMs: 2,
    ...overrides
  };
}

function installSdk(options: Readonly<{
  authorized?: boolean;
  cloudData?: unknown;
  methodAvailable?: boolean;
}> = {}) {
  const setData = vi.fn().mockResolvedValue(undefined);
  const getData = vi.fn().mockResolvedValue(
    options.cloudData === undefined
      ? {}
      : { durakProfileV1: options.cloudData }
  );
  const setScore = vi.fn().mockResolvedValue(undefined);
  const getEntries = vi.fn().mockResolvedValue({
    entries: [
      {
        rank: 1,
        score: 2400,
        formattedScore: "2400",
        player: {
          lang: "ru",
          publicName: "RealOne",
          scopePermissions: {
            avatar: "allow",
            public_name: "allow"
          },
          uniqueID: "u1",
          getAvatarSrc: () => "",
          getAvatarSrcSet: () => ""
        }
      }
    ],
    leaderboard: {},
    ranges: [],
    userRank: 8
  });
  const isAvailableMethod = vi
    .fn()
    .mockResolvedValue(options.methodAvailable ?? true);
  const player = {
    isAuthorized: () => options.authorized ?? true,
    setData,
    getData
  };

  vi.stubGlobal("YaGames", {
    init: vi.fn().mockResolvedValue({
      environment: { i18n: { lang: "ru" } },
      getStorage: vi.fn().mockResolvedValue(window.localStorage),
      getPlayer: vi.fn().mockResolvedValue(player),
      features: {
        LoadingAPI: { ready: vi.fn() },
        GameplayAPI: { start: vi.fn(), stop: vi.fn() }
      },
      auth: {
        openAuthDialog: vi.fn().mockResolvedValue(undefined)
      },
      isAvailableMethod,
      leaderboards: {
        setScore,
        getEntries
      },
      on: vi.fn(),
      off: vi.fn()
    })
  });

  return {
    setData,
    getData,
    setScore,
    getEntries,
    isAvailableMethod
  };
}

describe("Yandex cloud profile and leaderboard", () => {
  it("loads and saves a valid authorized cloud profile", async () => {
    const cloud = profile({ rating: 1500, updatedAtMs: 10 });
    const mocks = installSdk({ cloudData: cloud });

    const platform = await initializeGamePlatform();

    expect(await platform.loadCloudProfile()).toEqual(cloud);
    await platform.saveCloudProfile(cloud);
    expect(mocks.getData).toHaveBeenCalledWith(["durakProfileV1"]);
    expect(mocks.setData).toHaveBeenCalledWith(
      { durakProfileV1: cloud },
      true
    );
  });

  it("rejects corrupt cloud profile data without harming local play", async () => {
    installSdk({
      cloudData: {
        schemaVersion: 1,
        nickname: "x",
        rating: "broken"
      }
    });

    const platform = await initializeGamePlatform();

    expect(await platform.loadCloudProfile()).toBeNull();
  });

  it("writes a rounded nonnegative score only when the method is available", async () => {
    const mocks = installSdk();
    const platform = await initializeGamePlatform();

    await platform.setLeaderboardScore(1376.7);
    expect(mocks.isAvailableMethod).toHaveBeenCalledWith(
      "leaderboards.setScore"
    );
    expect(mocks.setScore).toHaveBeenCalledWith("rating", 1377);
  });

  it("does not write leaderboard score for a guest", async () => {
    const mocks = installSdk({ authorized: false });
    const platform = await initializeGamePlatform();

    await platform.setLeaderboardScore(1400);
    expect(mocks.setScore).not.toHaveBeenCalled();
  });

  it("reads only SDK-provided leaderboard rows with the release window", async () => {
    const mocks = installSdk();
    const platform = await initializeGamePlatform();

    const snapshot = await platform.getLeaderboard();

    expect(mocks.getEntries).toHaveBeenCalledWith("rating", {
      quantityTop: 10,
      quantityAround: 3,
      includeUser: true
    });
    expect(snapshot).toEqual({
      entries: [
        { rank: 1, score: 2400, publicName: "RealOne" }
      ],
      userRank: 8
    });
  });

  it("returns null when leaderboard methods are unavailable", async () => {
    const mocks = installSdk({ methodAvailable: false });
    const platform = await initializeGamePlatform();

    expect(await platform.getLeaderboard()).toBeNull();
    await platform.setLeaderboardScore(1500);
    expect(mocks.getEntries).not.toHaveBeenCalled();
    expect(mocks.setScore).not.toHaveBeenCalled();
  });
});
