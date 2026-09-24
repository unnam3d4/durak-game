import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import { App } from "../../src/app/App";
import {
  GamePlatformContext,
  type GamePlatform
} from "../../src/platform/game-platform";
import { savePlayerProfile } from "../../src/profile/profile-storage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
});

function seedProfile(): void {
  savePlayerProfile(window.localStorage, {
    schemaVersion: 1,
    nickname: "Vovan_77",
    xp: 0,
    rating: 1000,
    matchesCompleted: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    createdAtMs: 1,
    updatedAtMs: 1
  });
}

function createPlatform(
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

describe("App interstitial transitions", () => {
  it("waits for the ad before entering matchmaking", async () => {
    seedProfile();

    let resolveAd: (() => void) | null = null;
    const showInterstitial = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAd = resolve;
        })
    );
    const platform = createPlatform(showInterstitial);

    render(
      <GamePlatformContext.Provider value={platform}>
        <App />
      </GamePlatformContext.Provider>
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Быстрый матч/ })
    );

    expect(showInterstitial).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Подбираем соперников…")
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveAd?.();
      await Promise.resolve();
    });

    expect(
      screen.getByText("Подбираем соперников…")
    ).toBeInTheDocument();
  });

  it("still enters matchmaking when the ad fails", async () => {
    seedProfile();

    const platform = createPlatform(
      vi.fn(async () => {
        throw new Error("offline");
      })
    );

    render(
      <GamePlatformContext.Provider value={platform}>
        <App />
      </GamePlatformContext.Provider>
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Быстрый матч/ })
      );
      await Promise.resolve();
    });

    expect(
      screen.getByText("Подбираем соперников…")
    ).toBeInTheDocument();
  });
});
