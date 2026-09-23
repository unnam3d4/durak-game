import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  saveCurrentMultiplayerMatch
} from "../../src/save/multiplayer-match-save";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/durak-game/");
  window.localStorage.clear();
});

describe("App", () => {
  it("opens the product menu on the default route", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: /Быстрый матч/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Режим")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 1")).not.toBeInTheDocument();
  });

  it("starts a quick two-player Podkidnoy match", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Быстрый матч/ }));

    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 2")).not.toBeInTheDocument();
    expect(screen.getByText("Подкидной")).toBeInTheDocument();
  });

  it("starts a custom three-player Perevodnoy match", () => {
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
