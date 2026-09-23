import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TableScreen } from "../../src/ui/TableScreen";
import { createMatch1v1 } from "../../src/rules/create-match";
import { makeState } from "../support/match-fixtures";

afterEach(() => {
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

  it("starts the next 20-second countdown only after the action animation finishes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const state = makeState({ attackerId: "human", defenderId: "bot", activePlayerId: "human", phase: "attack", table: [] });

    render(<TableScreen initialState={state} now={() => Date.now()} animationMs={300} botDelay={() => 15_000} />);
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    fireEvent.click(screen.getAllByTestId("human-card")[0]!);
    vi.advanceTimersByTime(299);
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("20");

    vi.advanceTimersByTime(1_000);
    await Promise.resolve();
    expect(screen.getByTestId("turn-seconds")).toHaveTextContent("19");
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
