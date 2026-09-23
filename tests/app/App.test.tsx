import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import {
  INITIAL_RATING,
  type PlayerProfileV1
} from "../../src/profile/player-profile";
import { savePlayerProfile } from "../../src/profile/profile-storage";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  saveCurrentMultiplayerMatch
} from "../../src/save/multiplayer-match-save";

function seedProfile(
  overrides: Partial<PlayerProfileV1> = {}
): void {
  savePlayerProfile(window.localStorage, {
    schemaVersion: 1,
    nickname: "Vovan_77",
    xp: 0,
    rating: INITIAL_RATING,
    matchesCompleted: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides
  });
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/durak-game/");
  window.localStorage.clear();
});

describe("App", () => {
  it("requires nickname onboarding on first launch", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Введите ник" })
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: /Быстрый матч/ })
    ).not.toBeInTheDocument();
  });

  it("creates a profile and opens the menu after valid onboarding", () => {
    render(<App />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "New_Player" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Продолжить" })
    );

    expect(
      screen.getByRole("button", { name: /Быстрый матч/ })
    ).toBeInTheDocument();
  });

  it("shows the current player's progression in the main menu", () => {
    seedProfile({
      nickname: "Vovan_77",
      xp: 900,
      rating: 1376,
      currentStreak: 2
    });
    render(<App />);

    expect(screen.getByText("Vovan_77")).toBeInTheDocument();
    expect(screen.getByText("Уровень 4")).toBeInTheDocument();
    expect(screen.getByText("Рейтинг 1376")).toBeInTheDocument();
    expect(screen.getByText("7-й разряд")).toBeInTheDocument();
    expect(screen.getByText("Серия 2")).toBeInTheDocument();
  });

  it("opens the product menu on the default route", () => {
    seedProfile();
    render(<App />);

    expect(
      screen.getByRole("button", { name: /Быстрый матч/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Режим")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 1")).not.toBeInTheDocument();
  });

  it("starts a quick two-player Podkidnoy match", () => {
    seedProfile();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Быстрый матч/ }));

    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 2")).not.toBeInTheDocument();
    expect(screen.getByText("Подкидной")).toBeInTheDocument();
  });

  it("starts a custom three-player Perevodnoy match", () => {
    seedProfile();
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Переводной" })
    );
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: /Играть/ }));

    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.getByText("Соперник 2")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 3")).not.toBeInTheDocument();
    expect(screen.getByText("Переводной")).toBeInTheDocument();
  });

  it("does not rewrite or delete an unfinished match while showing the menu", () => {
    seedProfile();
    const saved = createMultiplayerMatch(24680, 4, "perevodnoy");
    saveCurrentMultiplayerMatch(window.localStorage, saved, 1234);
    const before = window.localStorage.getItem(
      CURRENT_MULTIPLAYER_MATCH_KEY
    );

    render(<App />);

    expect(
      screen.getByRole("button", { name: /Продолжить/ })
    ).toBeInTheDocument();
    expect(
      window.localStorage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)
    ).toBe(before);
  });

  it("offers to continue a saved multiplayer match", () => {
    seedProfile();
    const created = createMultiplayerMatch(12345, 3);
    const opening = getMultiplayerLegalActions(
      created,
      created.activePlayerId
    ).find((action) => action.type === "play-attack");
    expect(opening?.type).toBe("play-attack");
    if (!opening || opening.type !== "play-attack") return;

    const saved = applyMultiplayerAction(created, opening);
    saveCurrentMultiplayerMatch(window.localStorage, saved, 1000);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Продолжить/ }));

    expect(
      screen.getByTestId(`attack-${opening.cardId}`)
    ).toBeInTheDocument();
    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("keeps direct preview links working for development", () => {
    seedProfile();
    window.history.replaceState(
      {},
      "",
      "/durak-game/?players=4&variant=perevodnoy"
    );

    render(<App />);

    expect(screen.getByText("Соперник 3")).toBeInTheDocument();
    expect(screen.getByText("Переводной")).toBeInTheDocument();
  });

  it("does not resume a save from a different direct-preview variant", () => {
    seedProfile();
    const saved = createMultiplayerMatch(888, 3, "podkidnoy");
    saveCurrentMultiplayerMatch(window.localStorage, saved, 1000);

    window.history.replaceState(
      {},
      "",
      "/durak-game/?players=3&variant=perevodnoy"
    );
    render(<App />);

    expect(screen.getByText("Переводной")).toBeInTheDocument();
    expect(screen.getByText("Стол свободен")).toBeInTheDocument();
  });
});
