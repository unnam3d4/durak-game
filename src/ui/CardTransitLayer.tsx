import type { ReactNode } from "react";
import { useCardTransit } from "./use-card-transit";

type Props = Readonly<{
  sourceRect: DOMRect | null;
  targetRect: DOMRect | null;
  durationMs?: number;
  reducedMotion?: boolean;
  onComplete: () => void;
  children: ReactNode;
}>;

export function CardTransitLayer({
  sourceRect,
  targetRect,
  durationMs = 260,
  reducedMotion = false,
  onComplete,
  children
}: Props) {
  const transit = useCardTransit({
    sourceRect,
    targetRect,
    durationMs,
    reducedMotion,
    onComplete
  });

  if (!transit.visible) return null;

  return (
    <div
      className="card-transit-layer"
      data-testid="card-transit"
      aria-hidden="true"
      style={transit.style}
    >
      {children}
    </div>
  );
}
