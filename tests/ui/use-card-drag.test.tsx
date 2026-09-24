import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCardDrag } from "../../src/ui/use-card-drag";

afterEach(cleanup);

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
    fireEvent.pointerDown(card, {
      pointerId: 1,
      clientX: 10,
      clientY: 20
    });
    fireEvent.pointerMove(card, {
      pointerId: 1,
      clientX: 15,
      clientY: 23
    });
    fireEvent.pointerUp(card, {
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
    fireEvent.pointerDown(card, {
      pointerId: 2,
      clientX: 10,
      clientY: 20
    });
    fireEvent.pointerMove(card, {
      pointerId: 2,
      clientX: 30,
      clientY: 45
    });

    expect(card).toHaveAttribute("data-dragging", "true");
    expect(card).toHaveStyle({ touchAction: "none" });

    fireEvent.pointerUp(card, {
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
    fireEvent.pointerDown(card, {
      pointerId: 3,
      clientX: 0,
      clientY: 0
    });
    fireEvent.pointerMove(card, {
      pointerId: 3,
      clientX: 20,
      clientY: 20
    });
    fireEvent.pointerCancel(card, { pointerId: 3 });

    expect(onTap).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
    expect(card).toHaveAttribute("data-dragging", "false");
  });
});
