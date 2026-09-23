import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import { saveCurrentMultiplayerMatch } from "../../src/save/multiplayer-match-save";

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

  it("resumes a saved multiplayer bout for the matching player count", () => {
    const created = createMultiplayerMatch(12345, 3);
    const opening = getMultiplayerLegalActions(
      created,
      created.activePlayerId
    ).find((action) => action.type === "play-attack");
    expect(opening?.type).toBe("play-attack");
    if (!opening || opening.type !== "play-attack") return;

    const saved = applyMultiplayerAction(created, opening);
    saveCurrentMultiplayerMatch(window.localStorage, saved, 1000);

    window.history.replaceState({}, "", "/durak-game/?players=3");
    render(<App />);

    expect(
      screen.getByTestId(`attack-${opening.cardId}`)
    ).toBeInTheDocument();
    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("opens the Perevodnoy preview from the variant query", () => {
    window.history.replaceState(
      {},
      "",
      "/durak-game/?players=3&variant=perevodnoy"
    );
    render(<App />);

    expect(screen.getAllByText("Переводной")).toHaveLength(1);
    expect(screen.getByText("Соперник 2")).toBeInTheDocument();
  });

  it("does not resume a save from a different multiplayer variant", () => {
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
