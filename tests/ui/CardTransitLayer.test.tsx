import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardTransitLayer } from "../../src/ui/CardTransitLayer";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function rect(
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({})
  } as DOMRect;
}

describe("CardTransitLayer", () => {
  it("moves an overlay from the source center to the target center", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    );

    render(
      <CardTransitLayer
        sourceRect={rect(10, 20, 40, 60)}
        targetRect={rect(210, 120, 80, 120)}
        durationMs={300}
        onComplete={() => undefined}
      >
        <span>card</span>
      </CardTransitLayer>
    );

    const overlay = screen.getByTestId("card-transit");
    expect(overlay).toHaveStyle({
      left: "10px",
      top: "20px",
      width: "40px",
      height: "60px"
    });
    expect(overlay.getAttribute("style")).toContain(
      "translate(220px, 130px)"
    );
    expect(overlay.getAttribute("style")).toContain("scale(2, 2)");
    expect(overlay).toHaveStyle({ pointerEvents: "none" });
  });

  it("completes once after the configured duration", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    );
    const onComplete = vi.fn();

    const { rerender } = render(
      <CardTransitLayer
        sourceRect={rect(0, 0, 40, 60)}
        targetRect={rect(100, 100, 40, 60)}
        durationMs={250}
        onComplete={onComplete}
      >
        <span>card</span>
      </CardTransitLayer>
    );

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    rerender(
      <CardTransitLayer
        sourceRect={rect(0, 0, 40, 60)}
        targetRect={rect(100, 100, 40, 60)}
        durationMs={250}
        onComplete={onComplete}
      >
        <span>card</span>
      </CardTransitLayer>
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("skips decorative waiting under reduced motion but still completes once", () => {
    const onComplete = vi.fn();

    render(
      <CardTransitLayer
        sourceRect={rect(0, 0, 40, 60)}
        targetRect={rect(100, 100, 40, 60)}
        durationMs={300}
        reducedMotion
        onComplete={onComplete}
      >
        <span>card</span>
      </CardTransitLayer>
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("card-transit")).not.toBeInTheDocument();
  });
});
