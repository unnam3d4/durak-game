import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiplayerTableScreen } from "../../src/ui/MultiplayerTableScreen";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MultiplayerTableScreen", () => {
  it("renders every seated opponent in a four-player match", () => {
    const state = makeMultiplayerState({}, 4);

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.getByText("Соперник 2")).toBeInTheDocument();
    expect(screen.getByText("Соперник 3")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(6);
  });

  it("lets the human open a bout with several equal-rank cards", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [
          card("clubs", 7),
          card("diamonds", 7),
          card("spades", 9)
        ],
        bot: [card("clubs", 10), card("diamonds", 10), card("hearts", 10)],
        bot2: [card("clubs", 11), card("diamonds", 11), card("hearts", 11)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 3
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 треф" }));
    fireEvent.click(screen.getByRole("button", { name: "7 бубен" }));
    fireEvent.click(screen.getByRole("button", { name: "Ход: 2 карты" }));

    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(screen.getByTestId("attack-clubs-7")).toBeInTheDocument();
    expect(screen.getByTestId("attack-diamonds-7")).toBeInTheDocument();
  });

  it("lets the human choose which attack an ambiguous defense covers", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("spades", 6), card("clubs", 8)],
        bot: [card("diamonds", 9)],
        bot2: [card("hearts", 10)],
        bot3: []
      },
      talon: [],
      trumpCard: card("spades", 14),
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2,
      table: [
        { attack: card("hearts", 7) },
        { attack: card("clubs", 7) }
      ]
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "6 пик" }));
    expect(screen.getByTestId("attack-hearts-7")).toBeEnabled();
    expect(screen.getByTestId("attack-clubs-7")).toBeEnabled();

    fireEvent.click(screen.getByTestId("attack-clubs-7"));

    expect(screen.getByTestId("defense-clubs-7")).toHaveAttribute(
      "aria-label",
      "6 пик"
    );
    expect(screen.queryByTestId("defense-hearts-7")).not.toBeInTheDocument();
  });

  it("offers a pass while the human has throw-in priority", () => {
    const state = makeMultiplayerState({
      hands: {
        human: [card("diamonds", 9)],
        bot: [card("clubs", 10)],
        bot2: [card("hearts", 11)],
        bot3: []
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      table: [
        {
          attack: card("clubs", 7),
          defense: card("clubs", 8)
        }
      ],
      defenderHandSizeAtBoutStart: 3
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByRole("button", { name: "Пас" })).toBeInTheDocument();
  });

  it("lets a bot continue automatically when it owns the turn", async () => {
    vi.useFakeTimers();
    const state = makeMultiplayerState({
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 500}
      />
    );

    expect(screen.getByText("Стол свободен")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("pauses a pending multiplayer bot move while the page is hidden", async () => {
    vi.useFakeTimers();
    const state = makeMultiplayerState({
      attackerId: "bot",
      defenderId: "bot2",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 500}
      />
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(screen.getByText("Стол свободен")).toBeInTheDocument();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("persists multiplayer state after a human action", () => {
    window.localStorage.clear();
    const state = makeMultiplayerState({
      hands: {
        human: [card("clubs", 7), card("diamonds", 9)],
        bot: [card("clubs", 10), card("hearts", 11)],
        bot2: [card("spades", 12), card("diamonds", 13)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => 1234}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 треф" }));

    const raw = window.localStorage.getItem(
      "durak.currentMatch.multiplayer.v2"
    );
    expect(raw).not.toBeNull();
    expect(raw).toContain("clubs-7");
    expect(raw).toContain('"savedAtMs":1234');
  });
});
