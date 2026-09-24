import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import type { KeyValueStorage } from "../../src/save/storage";
import {
  INITIAL_RATING,
  type PlayerProfileV1
} from "../../src/profile/player-profile";
import {
  loadPlayerProfile,
  savePlayerProfile
} from "../../src/profile/profile-storage";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  saveCurrentMultiplayerMatch
} from "../../src/save/multiplayer-match-save";
import {
  saveRankedMatchContext
} from "../../src/save/ranked-match-context-save";

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    }
  };
}

function seedProfile(
  overrides: Partial<PlayerProfileV1> = {},
  storage: KeyValueStorage = window.localStorage
): void {
  savePlayerProfile(storage, {
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
  vi.useRealTimers();
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

  it("writes profile and current match to injected platform storage", async () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();

    render(<App storage={storage} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Safe_Player" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Продолжить" })
    );

    expect(loadPlayerProfile(storage)).toMatchObject({
      nickname: "Safe_Player"
    });
    expect(window.localStorage.length).toBe(0);

    fireEvent.click(
      screen.getByRole("button", { name: /Быстрый матч/ })
    );

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });

    expect(
      storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)
    ).not.toBeNull();
    expect(
      window.localStorage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)
    ).toBeNull();
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

  it("opens settings and persists the sound preference", () => {
    const storage = createMemoryStorage();
    seedProfile({}, storage);

    const { unmount } = render(<App storage={storage} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Настройки/ })
    );
    const toggle = screen.getByRole("switch", { name: "Звук" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    unmount();

    render(<App storage={storage} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Настройки/ })
    );
    expect(
      screen.getByRole("switch", { name: "Звук" })
    ).toHaveAttribute("aria-checked", "false");
  });

  it("starts a quick two-player Podkidnoy match after search", async () => {
    vi.useFakeTimers();
    seedProfile();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Быстрый матч/ }));
    expect(screen.getByText("Подбираем соперников…")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });

    expect(screen.getByTestId("seat-bot")).toBeInTheDocument();
    expect(screen.queryByTestId("seat-bot2")).not.toBeInTheDocument();
    expect(screen.queryByText("Соперник 1")).not.toBeInTheDocument();
    expect(screen.getByText("Подкидной")).toBeInTheDocument();
  });

  it("starts a custom three-player Perevodnoy match after search", async () => {
    vi.useFakeTimers();
    seedProfile();
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Переводной" })
    );
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: /Играть/ }));

    expect(screen.getByText("Подбираем соперников…")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });

    expect(screen.getByTestId("seat-bot")).toBeInTheDocument();
    expect(screen.getByTestId("seat-bot2")).toBeInTheDocument();
    expect(screen.queryByTestId("seat-bot3")).not.toBeInTheDocument();
    expect(screen.queryByText("Соперник 1")).not.toBeInTheDocument();
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

  it("requires explicit surrender before replacing a saved ranked match", () => {
    seedProfile({ rating: 1000 });
    const saved = createMultiplayerMatch(4242, 2, "podkidnoy");
    saveCurrentMultiplayerMatch(window.localStorage, saved, 1000);
    saveRankedMatchContext(window.localStorage, {
      schemaVersion: 1,
      matchSeed: saved.seed,
      participantCount: 2,
      playerRatingAtStart: 1000,
      ratingEligible: true,
      opponents: [
        {
          participantId: "bot",
          nickname: "VIKTOR",
          hiddenRating: 1000,
          skill: "easy"
        }
      ]
    });
    const before = window.localStorage.getItem(
      CURRENT_MULTIPLAYER_MATCH_KEY
    );

    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: /Быстрый матч/ })
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "считается поражением"
    );
    expect(
      window.localStorage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)
    ).toBe(before);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Сдаться и начать новую"
      })
    );

    expect(
      window.localStorage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)
    ).toBeNull();
    expect(loadPlayerProfile(window.localStorage)).toMatchObject({
      rating: 988,
      matchesCompleted: 1,
      currentStreak: 0
    });
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

    expect(screen.getByTestId("seat-bot3")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 3")).not.toBeInTheDocument();
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
