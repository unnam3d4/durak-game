import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { savePlayerProfile } from "../../src/profile/profile-storage";
import { loadPlayerMeta, savePlayerMeta } from "../../src/meta/meta-storage";
import { createDefaultPlayerMeta } from "../../src/meta/player-meta";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function seed(): void {
  savePlayerProfile(window.localStorage, {
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
  });
  savePlayerMeta(window.localStorage, {
    ...createDefaultPlayerMeta(),
    coins: 300
  });
}

describe("App meta flow", () => {
  it("opens the progression hub and persists a cosmetic purchase", () => {
    seed();
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /Профиль и коллекция/ })
    );

    expect(screen.getByText("Прогресс и коллекция")).toBeInTheDocument();

    const buy = screen.getAllByRole("button", { name: /Купить/ })[0]!;
    fireEvent.click(buy);

    const meta = loadPlayerMeta(window.localStorage);
    expect(meta?.coins).toBeLessThan(300);
    expect(meta?.cosmetics.unlocked.length).toBeGreaterThan(2);
  });

  it("persists the daily reward", () => {
    seed();
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /Профиль и коллекция/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "Забрать" }));

    const meta = loadPlayerMeta(window.localStorage);
    expect(meta?.coins).toBeGreaterThan(300);
    expect(meta?.dailyReward.lastClaimUtcDay).not.toBeNull();
  });
});
