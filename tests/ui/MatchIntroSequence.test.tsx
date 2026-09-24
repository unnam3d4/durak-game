import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchIntroSequence } from "../../src/ui/MatchIntroSequence";
import { card } from "../support/match-fixtures";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MatchIntroSequence", () => {
  it("deals six cards round-robin, reveals trump, then announces the first attacker", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const participants = ["human", "bot", "bot2"] as const;
    const names = {
      human: "Vovan_77",
      bot: "VIKTOR",
      bot2: "Maks77",
      bot3: "Димон"
    } as const;

    render(
      <MatchIntroSequence
        participants={participants}
        attackerId="bot"
        trumpCard={card("hearts", 14)}
        names={names}
        beatMs={100}
        trumpMs={300}
        attackerMs={400}
        onComplete={onComplete}
      />
    );

    const sequence: string[] = [];
    for (let index = 0; index < participants.length * 6; index += 1) {
      const beat = screen.getByTestId("intro-deal-beat");
      sequence.push(beat.getAttribute("data-participant-id") ?? "");
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }

    expect(sequence).toEqual(
      Array.from({ length: 6 }, () => [...participants]).flat()
    );
    expect(screen.getByTestId("intro-trump")).toHaveTextContent("♥");
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId("intro-first-attacker")).toHaveTextContent(
      "VIKTOR ходит первым"
    );

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("skips decorative waits under reduced motion and completes once", () => {
    const onComplete = vi.fn();

    render(
      <MatchIntroSequence
        participants={["human", "bot"]}
        attackerId="human"
        trumpCard={card("spades", 6)}
        names={{
          human: "Vovan_77",
          bot: "VIKTOR",
          bot2: "Maks77",
          bot3: "Димон"
        }}
        reducedMotion
        onComplete={onComplete}
      />
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("match-intro")).not.toBeInTheDocument();
  });
});
