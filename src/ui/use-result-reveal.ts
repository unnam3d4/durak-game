import { useEffect, useState } from "react";
import type { MatchPhase } from "../core/game-types";

type ResultRevealOptions = Readonly<{
  phase: MatchPhase;
  animating: boolean;
  presentationActive: boolean;
  delayMs?: number;
}>;

export function useResultReveal({
  phase,
  animating,
  presentationActive,
  delayMs = 180
}: ResultRevealOptions): boolean {
  const [visible, setVisible] = useState(
    () => phase === "finished" && !animating && !presentationActive
  );

  useEffect(() => {
    if (
      phase !== "finished" ||
      animating ||
      presentationActive
    ) {
      setVisible(false);
      return;
    }

    if (visible) return;

    const timer = window.setTimeout(
      () => setVisible(true),
      Math.max(0, delayMs)
    );
    return () => window.clearTimeout(timer);
  }, [animating, delayMs, phase, presentationActive, visible]);

  return visible;
}
