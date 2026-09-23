import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MatchPhase } from "../../src/core/game-types";
import { useResultReveal } from "../../src/ui/use-result-reveal";

afterEach(() => {
  vi.useRealTimers();
});

describe("useResultReveal", () => {
  it("waits for presentation and animation before revealing a finished result", () => {
    vi.useFakeTimers();

    type HookProps = {
      phase: MatchPhase;
      animating: boolean;
      presentationActive: boolean;
    };

    const initialProps: HookProps = {
      phase: "attack",
      animating: false,
      presentationActive: false
    };

    const { result, rerender } = renderHook(
      ({ phase, animating, presentationActive }: HookProps) =>
        useResultReveal({
          phase,
          animating,
          presentationActive,
          delayMs: 180
        }),
      { initialProps }
    );

    expect(result.current).toBe(false);

    rerender({
      phase: "finished" as const,
      animating: true,
      presentationActive: true
    });
    expect(result.current).toBe(false);

    rerender({
      phase: "finished" as const,
      animating: false,
      presentationActive: false
    });

    act(() => {
      vi.advanceTimersByTime(179);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);

    rerender({
      phase: "attack" as const,
      animating: false,
      presentationActive: false
    });
    expect(result.current).toBe(false);
  });
});
