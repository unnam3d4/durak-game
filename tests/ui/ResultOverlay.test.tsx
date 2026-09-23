import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResultOverlay } from "../../src/ui/ResultOverlay";

afterEach(cleanup);

describe("ResultOverlay", () => {
  it("shows numeric rating movement after a ranked match", () => {
    render(
      <ResultOverlay
        title="1 место"
        text="Партия завершена."
        ratingChange={{
          before: 1376,
          after: 1387,
          delta: 11,
          rankBefore: "7-й разряд",
          rankAfter: "7-й разряд",
          xpGained: 100
        }}
      />
    );

    expect(screen.getByText("1376 → 1387")).toBeInTheDocument();
    expect(screen.getByText("+11")).toBeInTheDocument();
    expect(screen.getByText("+100 XP")).toBeInTheDocument();
  });

  it("marks a rank promotion without inventing a leaderboard place", () => {
    render(
      <ResultOverlay
        title="Победа"
        text="Партия завершена."
        ratingChange={{
          before: 1394,
          after: 1408,
          delta: 14,
          rankBefore: "7-й разряд",
          rankAfter: "6-й разряд",
          xpGained: 100
        }}
      />
    );

    expect(screen.getByText("Новый разряд")).toBeInTheDocument();
    expect(screen.getByText("6-й разряд")).toBeInTheDocument();
    expect(screen.queryByText(/место в рейтинге/i)).not.toBeInTheDocument();
  });
});
