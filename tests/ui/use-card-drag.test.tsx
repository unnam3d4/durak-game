import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCardDrag } from "../../src/ui/use-card-drag";

afterEach(cleanup);

function dispatchPointer(
  element: Element,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  init: { pointerId: number; clientX?: number; clientY?: number }
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0
  });
  Object.defineProperty(event, "pointerId", {
    configurable: true,
    value: init.pointerId
  });
  fireEvent(element, event);
}

function Harness({
  onTap,
  onDrop
}: {
  onTap: () => void;
  onDrop: (point: { x: number; y: number }) => void;
}) {
  const drag = useCardDrag({ onTap, onDrop, thresholdPx: 8 });
  return (
    <button
      data-testid="card"
      data-dragging={String(drag.dragging)}
      style={{ touchAction: drag.dragging ? "none" : "auto" }}
      {...drag.handlers}
    >
      card
    </button>
  );
}

describe("useCardDrag", () => {
  it("treats movement under the threshold as a normal tap", () => {
    const onTap = vi.fn();
    const onDrop = vi.fn();
    render(<Harness onTap={onTap} onDrop={onDrop} />);

    const card = screen.getByTestId("card");
    dispatchPointer(card, "pointerdown", {
      pointerId: 1,
      clientX: 10,
      clientY: 20
    });
    dispatchPointer(card, "pointermove", {
      pointerId: 1,
      clientX: 15,
      clientY: 23
    });
    dispatchPointer(card, "pointerup", {
      pointerId: 1,
      clientX: 15,
      clientY: 23
    });

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("starts dragging after the threshold and drops exactly once", () => {
    const onTap = vi.fn();
    const onDrop = vi.fn();
    render(<Harness onTap={onTap} onDrop={onDrop} />);

    const card = screen.getByTestId("card");
    dispatchPointer(card, "pointerdown", {
      pointerId: 2,
      clientX: 10,
      clientY: 20
    });
    dispatchPointer(card, "pointermove", {
      pointerId: 2,
      clientX: 30,
      clientY: 45
    });

    expect(card).toHaveAttribute("data-dragging", "true");
    expect(card).toHaveStyle({ touchAction: "none" });

    dispatchPointer(card, "pointerup", {
      pointerId: 2,
      clientX: 32,
      clientY: 47
    });

    expect(onTap).not.toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith({ x: 32, y: 47 });
    expect(card).toHaveAttribute("data-dragging", "false");
  });

  it("resets on pointercancel without tapping or dropping", () => {
    const onTap = vi.fn();
    const onDrop = vi.fn();
    render(<Harness onTap={onTap} onDrop={onDrop} />);

    const card = screen.getByTestId("card");
    dispatchPointer(card, "pointerdown", {
      pointerId: 3,
      clientX: 0,
      clientY: 0
    });
    dispatchPointer(card, "pointermove", {
      pointerId: 3,
      clientX: 20,
      clientY: 20
    });
    dispatchPointer(card, "pointercancel", { pointerId: 3 });

    expect(onTap).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
    expect(card).toHaveAttribute("data-dragging", "false");
  });
});
