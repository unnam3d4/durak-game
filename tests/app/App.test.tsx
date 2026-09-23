import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import {
  createPlayerProfile,
  savePlayerProfile
} from "../../src/profile/player-profile";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { getMultiplayerLegalActions } from "../../src/rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import { saveCurrentMultiplayerMatch } from "../../src/save/multiplayer-match-save";

function seedProfile(nickname = "Игрок_7") {
  savePlayerProfile(
    window.localStorage,
    createPlayerProfile(nickname, 1000)
  );
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/durak-game/");
  window.localStorage.clear();
});

describe("App first run", () => {
  it("requires a valid nickname before opening the menu", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Как тебя зовут за столом?"
      })
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Имя игрока");
    fireEvent.change(input, { target: { value: "Игрок_7" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Сесть за стол" })
    );

    expect(
      screen.getByRole("heading", { name: "Дурак" })
    ).toBeInTheDocument();
    expect(screen.getByText("Игрок_7")).toBeInTheDocument();
  });

  it("keeps the player on setup when the nickname is invalid", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Имя игрока"), {
      target: { value: "ab" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Сесть за стол" })
    );

    expect(
      screen.getByText("Имя должно содержать от 3 до 16 символов.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Быстрый матч/ })
    ).not.toBeInTheDocument();
  });
});

describe("App product menu", () => {
  it("opens the product menu for a returning player", () => {
    seedProfile();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Дурак" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Быстрый матч/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Выбрать режим/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Игрок_7")).toBeInTheDocument();
    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });

  it("starts a two-player Podkidnoy quick match with the saved nickname", () => {
    seedProfile("Север_7");
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /Быстрый матч/ })
    );

    expect(screen.getByText("Подкидной")).toBeInTheDocument();
    expect(screen.getByText("2 игрока")).toBeInTheDocument();
    expect(screen.getByText("Север_7")).toBeInTheDocument();
    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 2")).not.toBeInTheDocument();
  });

  it("returns to the menu and exposes the current match as resumable", () => {
    seedProfile();
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /Быстрый матч/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "В меню" })
    );

    expect(
      screen.getByRole("button", { name: /Продолжить/ })
    ).toBeInTheDocument();
  });

  it("starts a custom four-player Perevodnoy match from the menu", () => {
    seedProfile();
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /Выбрать режим/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Переводной/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /4 игрока/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Начать партию" })
    );

    expect(screen.getByText("Переводной")).toBeInTheDocument();
    expect(screen.getByText("4 игрока")).toBeInTheDocument();
    expect(screen.getByText("Соперник 3")).toBeInTheDocument();
  });

  it("offers and resumes an unfinished multiplayer match", () => {
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

    fireEvent.click(
      screen.getByRole("button", { name: /Продолжить/ })
    );

    expect(
      screen.getByTestId(`attack-${opening.cardId}`)
    ).toBeInTheDocument();
    expect(screen.queryByText("Стол свободен")).not.toBeInTheDocument();
  });
});

describe("App QA preview routes", () => {
  it("opens the three-player prototype from the players query", () => {
    window.history.replaceState({}, "", "/durak-game/?players=3");
    render(<App />);

    expect(screen.getByText("3 игрока")).toBeInTheDocument();
    expect(screen.getByText("Соперник 1")).toBeInTheDocument();
    expect(screen.getByText("Соперник 2")).toBeInTheDocument();
    expect(screen.queryByText("Соперник 3")).not.toBeInTheDocument();
  });

  it("opens the four-player prototype from the players query", () => {
    window.history.replaceState({}, "", "/durak-game/?players=4");
    render(<App />);

    expect(screen.getByText("4 игрока")).toBeInTheDocument();
    expect(screen.getByText("Соперник 3")).toBeInTheDocument();
  });

  it("resumes a saved multiplayer bout for the matching player count", () => {
    const created = createMultiplayerMatch(54321, 3);
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

    expect(screen.getByText("Переводной")).toBeInTheDocument();
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
