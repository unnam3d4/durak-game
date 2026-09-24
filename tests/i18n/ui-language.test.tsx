import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { MultiplayerTableScreen } from "../../src/ui/MultiplayerTableScreen";
import { savePlayerProfile } from "../../src/profile/profile-storage";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/durak-game/");
});

describe("English release UI", () => {
  it("uses the selected language across the main menu and profile", () => {
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

    render(<App lang="en" />);

    expect(
      screen.getByRole("button", { name: /Quick match/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Mode")).toBeInTheDocument();
    expect(screen.getByText("Rating 1376")).toBeInTheDocument();
    expect(screen.getByText("Rank 7")).toBeInTheDocument();
    expect(screen.getByText("Streak 2")).toBeInTheDocument();
  });

  it("localizes table copy and card accessibility labels", () => {
    const state = makeMultiplayerState(
      {
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: []
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        lang="en"
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByText("Table is clear")).toBeInTheDocument();
    expect(screen.getByText("Podkidnoy")).toBeInTheDocument();
    expect(screen.getAllByText("2 players").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /clubs|diamonds|hearts|spades/ })
        .length
    ).toBeGreaterThan(0);
  });
});
