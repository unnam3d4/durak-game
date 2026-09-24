import { useRef, useState } from "react";
import type { PointerEventHandler } from "react";

export type CardDragResult = Readonly<{
  dragging: boolean;
  x: number;
  y: number;
  startX: number;
  startY: number;
}>;

export type CardDragOptions = Readonly<{
  thresholdPx?: number;
  onDrop: (point: { x: number; y: number }) => void;
  onTap: () => void;
}>;

type CardDragHandlers = Readonly<{
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
  onLostPointerCapture: PointerEventHandler<HTMLElement>;
}>;

export type UseCardDragResult = CardDragResult &
  Readonly<{ handlers: CardDragHandlers }>;

const EMPTY: CardDragResult = {
  dragging: false,
  x: 0,
  y: 0,
  startX: 0,
  startY: 0
};

function applyDragOffset(
  element: HTMLElement,
  dx: number,
  dy: number
): void {
  element.style.setProperty("--drag-x", `${dx}px`);
  element.style.setProperty("--drag-y", `${dy}px`);
}

function clearDragOffset(element: HTMLElement): void {
  element.style.removeProperty("--drag-x");
  element.style.removeProperty("--drag-y");
}

export function useCardDrag({
  thresholdPx = 8,
  onDrop,
  onTap
}: CardDragOptions): UseCardDragResult {
  const [state, setState] = useState<CardDragResult>(EMPTY);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const lastRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const reset = (element?: HTMLElement) => {
    pointerIdRef.current = null;
    draggingRef.current = false;
    if (element) clearDragOffset(element);
    setState(EMPTY);
  };

  const onPointerDown: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== null) return;

    pointerIdRef.current = event.pointerId;
    startRef.current = { x: event.clientX, y: event.clientY };
    lastRef.current = startRef.current;
    draggingRef.current = false;
    applyDragOffset(event.currentTarget, 0, 0);

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    const crossedThreshold =
      Math.hypot(dx, dy) >= Math.max(0, thresholdPx);

    lastRef.current = { x: event.clientX, y: event.clientY };

    if (!draggingRef.current && crossedThreshold) {
      draggingRef.current = true;
      setState({
        dragging: true,
        x: event.clientX,
        y: event.clientY,
        startX: startRef.current.x,
        startY: startRef.current.y
      });
    }

    if (draggingRef.current) {
      event.preventDefault();
      // Move the actual card directly instead of re-rendering React on
      // every pointermove. This is substantially smoother on phones.
      applyDragOffset(event.currentTarget, dx, dy);
    }
  };

  const onPointerUp: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const wasDragging = draggingRef.current;
    const point = { x: event.clientX, y: event.clientY };
    reset(event.currentTarget);

    if (wasDragging) onDrop(point);
    else onTap();
  };

  const onPointerCancel: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    reset(event.currentTarget);
  };

  const onLostPointerCapture: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    reset(event.currentTarget);
  };

  return {
    ...state,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture
    }
  };
}
