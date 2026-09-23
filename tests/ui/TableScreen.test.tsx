import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TableScreen } from "../../src/ui/TableScreen";
import { createMatch1v1 } from "../../src/rules/create-match";
import { makeState } from "../support/match-fixtures";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TableScreen", () => {
  it("renders both seats, six human cards, talon count, and trump", () => {
    const state = createMatch1v1(123);
    render(<TableScreen initialState={state} now={() => 0} animationMs={300} botDelay={() => 500} />);

    expect(screen.getByText("Соперник")).toBeInTheDocument();
    expect(screen.getByText("Игрок")).toBeInTheDocument();
    expect(screen.getAllByTestId("human-card")).toHaveLength(6);
    expect(screen.getByTestId("talon-count")).toHaveTextContent("24");
    expect(screen.getByTestId("trump-card")).toBeInTheDocument();
  });

  it("stops rendering the physical trump card after it leaves the talon", () => {
    const created = createMatch1v1(123);
    const state = {
      ...created,
      talon: [],
      table: [{ attack: created.trumpCard }]
    };

    render(<TableScreen initialState={state} now={() => 0} animationMs={300} botDelay={() => 500} />);

    expect(screen.getByTestId("talon-count")).toHaveTextContent("0");
    expect(screen.queryByTestId("trump-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("trump-suit-marker")).toBeInTheDocument();
  });

  it("lets the player select and throw several equal-rank cards at once", () => {
    const state = makeState({
      hands: {
        human: [
          { id: "clubs-7", suit: "clubs", rank: 7 },
          { id: "diamonds-7", suit: "diamonds", rank: 7 },
          { id: "spades-9", suit: "spades", rank: 9 }
        ],
        bot: [
          { id: "clubs-10", suit: "clubs", rank: 10 },
          { id: "diamonds-10", suit: "diamonds", rank: 10 },
          { id: "hearts-10", suit: "hearts", rank: 10 }
        ]
      },
      talon: [],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: [],
      defenderHandSizeAtBoutStart: 3
    });

    render(<TableScreen initialState={state} now={() => 0} animationMs={0} botDelay={() => 15_000} />);

    fireEvent.click(screen.getByRole("button", { name: "7 треф" }));
    fireEvent.click(screen.getByRole("button", { name: "7 бубен" }));
    expect(screen.getByRole("button", { name: "Ход: 2 карты" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ход: 2 карты" }));
    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(screen.getByLabelText("7 треф")).toBeInTheDocument();
    expect(screen.getByLabelText("7 бубен")).toBeInTheDocument();
  });

  it("lets the player select several legal throw-ins together", () => {
    const state = makeState({
      hands: {
        human: [
          { id: "clubs-7", suit: "clubs", rank: 7 },
          { id: "diamonds-10", suit: "diamonds", rank: 10 },
          { id: "spades-11", suit: "spades", rank: 11 }
        ],
        bot: [
          { id: "clubs-9", suit: "clubs", rank: 9 },
          { id: "diamonds-12", suit: "diamonds", rank: 12 },
          { id: "spades-13", suit: "spades", rank: 13 }
        ]
      },
      talon: [],
      table: [{
        attack: { id: "hearts-7", suit: "hearts", rank: 7 },
        defense: { id: "hearts-10", suit: "hearts", rank: 10 }
      }],
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "throw-in",
      defenderHandSizeAtBoutStart: 3
    });

    render(<TableScreen initialState={state} now={() => 0} animationMs={0} botDelay={() => 15_000} />);

    fireEvent.click(screen.getByRole("button", { name: "7 треф" }));
    fireEvent.click(screen.getByRole("button", { name: "10 бубен" }));
    fireEvent.click(screen.getByRole("button", { name: "Ход: 2 карты" }));

    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(screen.getByLabelText("7 треф")).toBeInTheDocument();
    expect(screen.getByLabelText("10 бубен")).toBeInTheDocument();
  });

  it("starts the next 20-second countdown only after the action animation finishes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeState({ attackerId: "human", defenderId: "bot", activePlayerId: "human", phase: "attack", table: [] });

    render(<TableScreen initialState={state} now={() => Date.now()} animationMs={300} botDelay={() => 15_000} />);
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    fireEvent.click(screen.getAllByTestId("human-card")[0]!);
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("19");
  });

  it("pauses the turn timer while the page is hidden and resumes with the same time left", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <TableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("15");

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
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("15");
    expect(screen.queryByText("Время вышло")).not.toBeInTheDocument();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("10");
  });

  it("pauses the turn timer while the game window is unfocused", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <TableScreen
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

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("16");

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("10");
  });

  it("stays paused if an action animation finishes while the window is blurred", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeState({
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });

    render(
      <TableScreen
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

  it("pauses a pending bot move while the page is hidden", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeState({
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "bot",
      phase: "attack",
      table: []
    });

    render(
      <TableScreen
        initialState={state}
        now={() => Date.now()}
        animationMs={0}
        botDelay={() => 1_000}
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
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("lets the defender choose which attack to cover with an ambiguous trump", () => {
    const state = makeState({
      hands: {
        human: [
          { id: "spades-6", suit: "spades", rank: 6 },
          { id: "clubs-8", suit: "clubs", rank: 8 }
        ],
        bot: [
          { id: "diamonds-9", suit: "diamonds", rank: 9 }
        ]
      },
      trumpCard: { id: "spades-14", suit: "spades", rank: 14 },
      talon: [],
      table: [
        { attack: { id: "hearts-7", suit: "hearts", rank: 7 } },
        { attack: { id: "clubs-7", suit: "clubs", rank: 7 } }
      ],
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      defenderHandSizeAtBoutStart: 2
    });

    render(
      <TableScreen
        initialState={state}
        now={() => 0}
        animationMs={0}
        botDelay={() => 15_000}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "6 пик" }));

    expect(screen.getByTestId("human-card")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("attack-hearts-7")).toBeEnabled();
    expect(screen.getByTestId("attack-clubs-7")).toBeEnabled();

    fireEvent.click(screen.getByTestId("attack-clubs-7"));

    expect(screen.getAllByTestId("human-card")).toHaveLength(1);
    expect(screen.getByTestId("defense-clubs-7")).toHaveAttribute(
      "aria-label",
      "6 пик"
    );
    expect(screen.queryByTestId("defense-hearts-7")).not.toBeInTheDocument();
  });

  it("offers Take when the human is defending", () => {
    const state = makeState({
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: { id: "table-attack", suit: "clubs", rank: 6 } }]
    });

    render(<TableScreen initialState={state} now={() => 0} animationMs={0} botDelay={() => 500} />);
    expect(screen.getByRole("button", { name: "Беру" })).toBeInTheDocument();
  });
});
