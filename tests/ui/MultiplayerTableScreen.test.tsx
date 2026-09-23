import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
      attackerId: "bot2",
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

  it("shows finishing places and the human placement at game end", () => {
    const state = makeMultiplayerState(
      {
        hands: {
          human: [],
          bot: [card("clubs", 14)],
          bot2: [],
          bot3: []
        },
        talon: [],
        table: [],
        phase: "finished",
        finishOrder: ["bot2", "human", "bot3"],
        boutFinishOrder: [],
        foolId: "bot",
        activePlayerId: "bot"
      },
      4
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByText("1 место")).toBeInTheDocument();
    expect(screen.getByText("3 место")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "2 место" }))
      .toBeInTheDocument();
    expect(within(dialog).getByText("Соперник 1 остался с картами."))
      .toBeInTheDocument();
  });

  it("starts a 20-second multiplayer turn timer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeMultiplayerState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("15");
  });

  it("pauses the multiplayer turn timer while hidden", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeMultiplayerState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("16");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("16");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("10");
  });

  it("ends the match with a technical loss when a human opening turn reaches zero", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const low = card("diamonds", 7);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [card("hearts", 6), card("clubs", 9), low],
          bot: [card("clubs", 10), card("diamonds", 10)],
          bot2: [],
          bot3: []
        },
        trumpCard: card("hearts", 14),
        attackerId: "human",
        defenderId: "bot",
        activePlayerId: "human",
        phase: "attack",
        table: [],
        defenderHandSizeAtBoutStart: 2
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(20_250);
      await Promise.resolve();
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Время вышло" }))
      .toBeInTheDocument();
    expect(within(dialog).getByText("Техническое поражение."))
      .toBeInTheDocument();
    expect(screen.queryByTestId("attack-diamonds-7")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(3);
  });

  it("does not auto-take when the human defender reaches zero", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const attack = card("clubs", 7);
    const state = makeMultiplayerState(
      {
        hands: {
          human: [card("diamonds", 9)],
          bot: [card("spades", 10)],
          bot2: [],
          bot3: []
        },
        talon: [],
        trumpCard: card("hearts", 14),
        attackerId: "bot",
        defenderId: "human",
        activePlayerId: "human",
        phase: "defend",
        table: [{ attack }],
        defenderHandSizeAtBoutStart: 1
      },
      2
    );

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(20_250);
      await Promise.resolve();
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Время вышло" }))
      .toBeInTheDocument();
    expect(screen.getByTestId("attack-clubs-7")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
  });

  it("does not restart the multiplayer clock if an animation ends while blurred", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeMultiplayerState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={300}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getAllByTestId("human-card")[0]!);
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("19");
  });

  it("lets the human select matching cards and transfer the attack", () => {
    const opening = card("clubs", 7);
    const firstTransfer = card("diamonds", 7);
    const secondTransfer = card("hearts", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [firstTransfer, secondTransfer, card("spades", 9)],
        bot: [
          card("clubs", 8),
          card("diamonds", 9),
          card("hearts", 10)
        ],
        bot2: [card("clubs", 10)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 3
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 бубен" }));
    fireEvent.click(screen.getByRole("button", { name: "7 червей" }));

    expect(
      screen.getByRole("button", { name: "Перевести: 2 карты" })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Перевести: 2 карты" })
    );

    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(screen.getByTestId("attack-diamonds-7")).toBeInTheDocument();
    expect(screen.getByTestId("attack-hearts-7")).toBeInTheDocument();
  });

  it("still lets an ambiguous trump transfer card be used for defense", () => {
    const opening = card("clubs", 7);
    const trumpTransfer = card("spades", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [trumpTransfer, card("diamonds", 9)],
        bot: [
          card("clubs", 8),
          card("diamonds", 10),
          card("hearts", 11)
        ],
        bot2: [card("diamonds", 7), card("clubs", 10)],
        bot3: []
      },
      trumpCard: card("spades", 6),
      attackerId: "bot2",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2
    });

    render(
      <MultiplayerTableScreen
        initialState={state}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7 пик" }));
    expect(screen.getByRole("button", { name: "Перевести: 1 карта" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отбить выбранной" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Отбить выбранной" }));

    expect(screen.getByTestId("defense-clubs-7")).toHaveAttribute(
      "aria-label",
      "7 пик"
    );
  });
});
