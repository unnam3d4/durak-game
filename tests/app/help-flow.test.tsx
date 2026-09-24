import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { savePlayerProfile } from "../../src/profile/profile-storage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function seedProfile(): void {
  savePlayerProfile(window.localStorage, {
    schemaVersion: 1,
    nickname: "Vovan_77",
    xp: 0,
    rating: 1000,
    matchesCompleted: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    createdAtMs: 1,
    updatedAtMs: 1
  });
}

describe("help flow", () => {
  it("describes mouse/touch controls and both Durak variants", () => {
    seedProfile();
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /Как играть/ })
    );

    expect(screen.getByRole("heading", { name: "Как играть" }))
      .toBeInTheDocument();
    expect(screen.getByText(/перетащить мышью/i)).toBeInTheDocument();
    expect(screen.getByText(/перетащить пальцем/i)).toBeInTheDocument();
    expect(screen.getByText("Подкидной")).toBeInTheDocument();
    expect(screen.getByText("Переводной")).toBeInTheDocument();
    expect(screen.getByText(/20 секунд/)).toBeInTheDocument();
  });
});
