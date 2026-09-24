import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MatchSearchScreen } from "../../src/ui/MatchSearchScreen";
import { MultiplayerTableScreen } from "../../src/ui/MultiplayerTableScreen";
import { ResultOverlay } from "../../src/ui/ResultOverlay";
import type { OpponentSeatProfile } from "../../src/matchmaking/opponent-profiles";
import type { PlayerProfileV1 } from "../../src/profile/player-profile";
import { savePlayerProfile } from "../../src/profile/profile-storage";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/durak-game/");
});

function seedProfile(): PlayerProfileV1 {
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
  savePlayerProfile(window.localStorage, profile);
  return profile;
}

const opponents: readonly OpponentSeatProfile[] = [
  {
    participantId: "bot",
    nickname: "VIKTOR",
    hiddenRating: 1360,
    skill: "normal"
  },
  {
    participantId: "bot2",
    nickname: "Maks77",
    hiddenRating: 1390,
    skill: "normal"
  },
  {
    participantId: "bot3",
    nickname: "Димон",
    hiddenRating: 1340,
    skill: "normal"
  }
];

function expectNoVisibleBotLabel(): void {
  expect(document.body.textContent?.toLowerCase()).not.toContain("bot");
  expect(document.body.textContent).not.toContain("Соперник 1");
  expect(document.body.textContent).not.toContain("Соперники — боты");
}

describe("release responsive structure", () => {
  it("keeps onboarding and the main menu operable without implementation labels", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Введите ник" }))
      .toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Продолжить" })).toBeEnabled();

    cleanup();
    seedProfile();
    render(<App />);

    expect(screen.getByRole("button", { name: /Быстрый матч/ }))
      .toBeEnabled();
    expect(screen.getByText("Рейтинг 1376")).toBeInTheDocument();
    expectNoVisibleBotLabel();
  });

  it("keeps randomized search copy and cancellation visible", () => {
    vi.useFakeTimers();
    render(
      <MatchSearchScreen
        schedule={{
          reveals: [
            { participantId: "bot", revealAtMs: 1200 },
            { participantId: "bot2", revealAtMs: 2600 },
            { participantId: "bot3", revealAtMs: 4100 }
          ],
          completeAtMs: 5200
        }}
        opponents={opponents}
        onCancel={() => undefined}
        onComplete={() => undefined}
      />
    );

    expect(screen.getByRole("heading", { name: "Подбираем соперников…" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeEnabled();
    expectNoVisibleBotLabel();
  });

  it("keeps a four-player table accessible by buttons as well as drag", () => {
    const state = makeMultiplayerState(
      {
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: []
      },
      4
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        playerNickname="Vovan_77"
        opponentProfiles={opponents}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByText("VIKTOR")).toBeInTheDocument();
    expect(screen.getByText("Maks77")).toBeInTheDocument();
    expect(screen.getByText("Димон")).toBeInTheDocument();

    const cardButtons = document.querySelectorAll<HTMLButtonElement>(
      ".human-hand button.card"
    );
    expect(cardButtons.length).toBeGreaterThan(0);
    for (const button of cardButtons) {
      expect(button.getAttribute("aria-label")).toBeTruthy();
    }
    expectNoVisibleBotLabel();
  });

  it("keeps opponent turns quiet without thinking-status copy", () => {
    const state = makeMultiplayerState(
      {
        attackerId: "bot",
        defenderId: "human",
        activePlayerId: "bot",
        phase: "attack",
        table: []
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        playerNickname="Vovan_77"
        opponentProfiles={[opponents[0]!]}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.queryByText(/думает/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/отбивается/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/карты на столе/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");
  });

  it("keeps result progression and both exit actions available", () => {
    render(
      <ResultOverlay
        title="1 место"
        text="Партия окончена."
        ratingChange={{
          before: 1376,
          after: 1390,
          delta: 14,
          rankBefore: "7-й разряд",
          rankAfter: "7-й разряд",
          xpGained: 100
        }}
        onRestart={() => undefined}
        onExitToMenu={() => undefined}
      />
    );

    expect(screen.getByText("1376 → 1390")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новая партия" }))
      .toBeEnabled();
    expect(screen.getByRole("button", { name: "В меню" })).toBeEnabled();
  });
});
