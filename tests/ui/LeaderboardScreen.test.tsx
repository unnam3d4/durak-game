import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlatform } from "../../src/platform/game-platform";
import { LeaderboardScreen } from "../../src/ui/LeaderboardScreen";
import type { PlayerProfileV1 } from "../../src/profile/player-profile";

afterEach(cleanup);

const profile: PlayerProfileV1 = {
  schemaVersion: 1,
  nickname: "Vovan_77",
  xp: 900,
  rating: 1376,
  matchesCompleted: 12,
  wins: 5,
  currentStreak: 2,
  bestStreak: 4,
  createdAtMs: 1,
  updatedAtMs: 2
};

function platform(): GamePlatform {
  return {
    kind: "yandex",
    lang: "ru",
    storage: window.localStorage,
    isAuthorized: () => true,
    authorize: async () => true,
    loadingReady: () => undefined,
    gameplayStart: () => undefined,
    gameplayStop: () => undefined,
    saveCloudProfile: async () => undefined,
    loadCloudProfile: async () => null,
    setLeaderboardScore: async () => undefined,
    getLeaderboard: async () => ({
      entries: [
        { rank: 1, score: 2400, publicName: "RealOne" },
        { rank: 2, score: 2300, publicName: "RealTwo" }
      ],
      userRank: 8
    }),
    showInterstitial: async () => undefined,
    onPlatformPause: () => () => undefined,
    onPlatformResume: () => () => undefined
  };
}

describe("LeaderboardScreen", () => {
  it("renders only real entries returned by the platform", async () => {
    render(
      <LeaderboardScreen
        platform={platform()}
        profile={profile}
        authorized
        onAuthorize={async () => true}
        onBack={() => undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("RealOne")).toBeInTheDocument();
    });
    expect(screen.getByText("RealTwo")).toBeInTheDocument();
    expect(screen.getByText("Рейтинг формируется")).toBeInTheDocument();
    expect(screen.queryByText(/Соперник/)).not.toBeInTheDocument();
    expect(screen.getByText("Ваше место: 8")).toBeInTheDocument();
  });

  it("offers explicit authorization instead of fabricating guest rows", () => {
    const p = platform();
    render(
      <LeaderboardScreen
        platform={p}
        profile={profile}
        authorized={false}
        onAuthorize={vi.fn(async () => true)}
        onBack={() => undefined}
      />
    );

    expect(
      screen.getByRole("button", { name: "Войти через Яндекс" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
