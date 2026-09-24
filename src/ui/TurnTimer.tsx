import type { CSSProperties } from "react";
import {
  t,
  type Language
} from "../i18n/i18n";
import { TURN_LIMIT_MS } from "../timer/turn-timer";

type Props = Readonly<{
  remainingMs: number;
  paused?: boolean;
  lang?: Language;
}>;

export function TurnTimer({
  remainingMs,
  paused = false,
  lang = "ru"
}: Props) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const degrees = Math.max(
    0,
    Math.min(360, (remainingMs / TURN_LIMIT_MS) * 360)
  );
  const style = {
    "--timer-angle": `${degrees}deg`,
    "--timer-progress": `${Math.round((remainingMs / TURN_LIMIT_MS) * 100)}%`
  } as CSSProperties;

  return (
    <div
      className={`turn-timer${remainingMs <= 5000 ? " turn-timer--urgent" : ""}${paused ? " turn-timer--paused" : ""}`}
      style={style}
      aria-label={
        paused
          ? t(lang, "timerPaused")
          : t(lang, "secondsLeft", { count: seconds })
      }
    >
      <div className="turn-timer__inner">
        <strong data-testid="turn-seconds">{seconds}</strong>
      </div>
    </div>
  );
}
