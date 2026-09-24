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

export function useCardDrag({
  thresholdPx = 8,
  onDrop,
  onTap
}: CardDragOptions): UseCardDragResult {
  const [state, setState] = useState<CardDragResult>(EMPTY);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const reset = () => {
    pointerIdRef.current = null;
    draggingRef.current = false;
    setState(EMPTY);
  };

  const onPointerDown: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== null) return;

    pointerIdRef.current = event.pointerId;
    startRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = false;
    setState({
      dragging: false,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY
    });

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    const crossedThreshold =
      Math.hypot(dx, dy) >= Math.max(0, thresholdPx);

    if (crossedThreshold) {
      draggingRef.current = true;
      event.preventDefault();
    }

    setState({
      dragging: draggingRef.current,
      x: event.clientX,
      y: event.clientY,
      startX: startRef.current.x,
      startY: startRef.current.y
    });
  };

  const onPointerUp: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const wasDragging = draggingRef.current;
    const point = { x: event.clientX, y: event.clientY };
    reset();

    if (wasDragging) onDrop(point);
    else onTap();
  };

  const onPointerCancel: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    reset();
  };

  const onLostPointerCapture: PointerEventHandler<HTMLElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    reset();
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
