import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchSearchScreen } from "../../src/ui/MatchSearchScreen";
import type { SearchSchedule } from "../../src/matchmaking/search-schedule";
import type { OpponentSeatProfile } from "../../src/matchmaking/opponent-profiles";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const schedule: SearchSchedule = {
  reveals: [
    { participantId: "bot", revealAtMs: 1000 },
    { participantId: "bot2", revealAtMs: 2500 },
    { participantId: "bot3", revealAtMs: 4100 }
  ],
  completeAtMs: 5000
};

const opponents: readonly OpponentSeatProfile[] = [
  { participantId: "bot", nickname: "VIKTOR", hiddenRating: 1300, skill: "normal" },
  { participantId: "bot2", nickname: "Maks77", hiddenRating: 1380, skill: "normal" },
  { participantId: "bot3", nickname: "Димон", hiddenRating: 1450, skill: "normal" }
];

describe("MatchSearchScreen", () => {
  it("reveals opponents according to the schedule and completes once", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <MatchSearchScreen
        schedule={schedule}
        opponents={opponents}
        onCancel={() => undefined}
        onComplete={onComplete}
      />
    );

    expect(screen.getByText("Подбираем соперников…")).toBeInTheDocument();
    expect(screen.queryByText("VIKTOR")).not.toBeInTheDocument();
    expect(screen.queryByText(/Готов/)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("VIKTOR")).toBeInTheDocument();
    expect(screen.getByText("Рейтинговый соперник")).toBeInTheDocument();
    expect(screen.queryByText("Maks77")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText("Maks77")).toBeInTheDocument();
    expect(screen.getByText("Димон")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cancels search without completing the match", async () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    const onComplete = vi.fn();

    render(
      <MatchSearchScreen
        schedule={schedule}
        opponents={opponents}
        onCancel={onCancel}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
