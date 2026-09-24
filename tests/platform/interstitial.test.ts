import { describe, expect, it, vi } from "vitest";
import type { GamePlatform } from "../../src/platform/game-platform";
import { runInterstitialThen } from "../../src/platform/interstitial";

function platform(
  showInterstitial: GamePlatform["showInterstitial"]
): GamePlatform {
  return {
    kind: "yandex",
    lang: "ru",
    storage: window.localStorage,
    isAuthorized: () => false,
    loadingReady: () => undefined,
    gameplayStart: () => undefined,
    gameplayStop: () => undefined,
    authorize: async () => false,
    saveCloudProfile: async () => undefined,
    loadCloudProfile: async () => null,
    setLeaderboardScore: async () => undefined,
    getLeaderboard: async () => null,
    showInterstitial,
    onPlatformPause: () => () => undefined,
    onPlatformResume: () => () => undefined
  };
}

describe("runInterstitialThen", () => {
  it("continues immediately without a platform", async () => {
    const continuation = vi.fn();

    await runInterstitialThen(null, continuation);

    expect(continuation).toHaveBeenCalledTimes(1);
  });

  it("continues after a successful ad promise", async () => {
    const continuation = vi.fn();
    const showInterstitial = vi.fn(async () => undefined);

    await runInterstitialThen(
      platform(showInterstitial),
      continuation
    );

    expect(showInterstitial).toHaveBeenCalledTimes(1);
    expect(continuation).toHaveBeenCalledTimes(1);
  });

  it("continues exactly once when the ad rejects", async () => {
    const continuation = vi.fn();
    const showInterstitial = vi.fn(async () => {
      throw new Error("ad failed");
    });

    await runInterstitialThen(
      platform(showInterstitial),
      continuation
    );

    expect(continuation).toHaveBeenCalledTimes(1);
  });
});
