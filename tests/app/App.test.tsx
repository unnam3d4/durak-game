import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/durak-game/");
  window.localStorage.clear();
});

describe("App multiplayer preview", () => {
  it("keeps the classic 1v1 build as the default route", () => {
    window.history.replaceState({}, "", "/durak-game/");
    render(<App />);

    expect(screen.getByText("1 × 1")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 2")).not.toBeInTheDocument();
  });

  it("opens the three-player prototype from the players query", () => {
    window.history.replaceState({}, "", "/durak-game/?players=3");
    render(<App />);

    expect(screen.getAllByText("3 игрока")).toHaveLength(2);
    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.getByText("Соперник 2")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 3")).not.toBeInTheDocument();
  });

  it("opens the four-player prototype from the players query", () => {
    window.history.replaceState({}, "", "/durak-game/?players=4");
    render(<App />);

    expect(screen.getAllByText("4 игрока")).toHaveLength(2);
    expect(screen.getByText("Соперник 3")).toBeInTheDocument();
  });
});
