import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import {
  GamePlatformContext,
  type GamePlatform
} from "../../src/platform/game-platform";
import { savePlayerProfile } from "../../src/profile/profile-storage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
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
  authorizedInitially = false
): {
  platform: GamePlatform;
  authorize: ReturnType<typeof vi.fn>;
} {
  let authorized = authorizedInitially;
  const authorize = vi.fn(async () => {
    authorized = true;
    return true;
  });

  const platform: GamePlatform = {
    kind: "yandex",
    lang: "ru",
    storage: window.localStorage,
    isAuthorized: () => authorized,
    loadingReady: vi.fn(),
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    authorize,
    saveCloudProfile: async () => undefined,
    loadCloudProfile: async () => null,
    setLeaderboardScore: async () => undefined,
    getLeaderboard: async () => null,
    showInterstitial: async () => undefined,
    onPlatformPause: () => () => undefined,
    onPlatformResume: () => () => undefined
  };

  return { platform, authorize };
}

describe("App Yandex authorization offer", () => {
  it("offers optional authorization to a guest without blocking the menu", async () => {
    seedProfile();
    const { platform, authorize } = createPlatform(false);

    render(
      <GamePlatformContext.Provider value={platform}>
        <App />
      </GamePlatformContext.Provider>
    );

    expect(
      screen.getByRole("button", { name: /Быстрый матч/ })
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Войти через Яндекс" })
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Войти через Яндекс" })
      );
      await Promise.resolve();
    });

    expect(authorize).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Войти через Яндекс" })
    ).not.toBeInTheDocument();
  });

  it("does not show the offer to an already authorized player", () => {
    seedProfile();
    const { platform } = createPlatform(true);

    render(
      <GamePlatformContext.Provider value={platform}>
        <App />
      </GamePlatformContext.Provider>
    );

    expect(
      screen.queryByRole("button", { name: "Войти через Яндекс" })
    ).not.toBeInTheDocument();
  });
});
