import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Options = Readonly<{
  sourceRect: DOMRect | null;
  targetRect: DOMRect | null;
  durationMs: number;
  reducedMotion: boolean;
  onComplete: () => void;
}>;

type Result = Readonly<{
  visible: boolean;
  style: CSSProperties;
}>;

export function useCardTransit({
  sourceRect,
  targetRect,
  durationMs,
  reducedMotion,
  onComplete
}: Options): Result {
  const [moved, setMoved] = useState(false);
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    if (reducedMotion || !sourceRect || !targetRect) {
      finish();
      return;
    }

    const raf = requestAnimationFrame(() => setMoved(true));
    const timer = window.setTimeout(
      finish,
      Math.max(0, durationMs)
    );

    return () => {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(raf);
      }
      window.clearTimeout(timer);
    };
  }, [
    durationMs,
    onComplete,
    reducedMotion,
    sourceRect,
    targetRect
  ]);

  const style = useMemo<CSSProperties>(() => {
    if (!sourceRect || !targetRect) return {};

    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;
    const scaleX =
      sourceRect.width > 0 ? targetRect.width / sourceRect.width : 1;
    const scaleY =
      sourceRect.height > 0 ? targetRect.height / sourceRect.height : 1;

    return {
      position: "fixed",
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
      height: sourceRect.height,
      pointerEvents: "none",
      transformOrigin: "center",
      transform: moved
        ? `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
        : "translate(0px, 0px) scale(1, 1)",
      transition: `transform ${Math.max(0, durationMs)}ms ease-out`,
      zIndex: 40
    };
  }, [durationMs, moved, sourceRect, targetRect]);

  return {
    visible:
      !reducedMotion &&
      sourceRect !== null &&
      targetRect !== null,
    style
  };
}
