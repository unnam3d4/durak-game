import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileSummary } from "../../src/ui/ProfileSummary";
import type { PlayerProfileV1 } from "../../src/profile/player-profile";

afterEach(cleanup);

describe("ProfileSummary", () => {
  it("shows nickname, level, rating, rank, and streak without a fake global place", () => {
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

    render(<ProfileSummary profile={profile} />);

    expect(screen.getByText("Vovan_77")).toBeInTheDocument();
    expect(screen.getByText("Уровень 4")).toBeInTheDocument();
    expect(screen.getByText("Рейтинг 1376")).toBeInTheDocument();
    expect(screen.getByText("7-й разряд")).toBeInTheDocument();
    expect(screen.getByText("Серия 2")).toBeInTheDocument();
    expect(screen.queryByText(/место/i)).not.toBeInTheDocument();
  });
});
