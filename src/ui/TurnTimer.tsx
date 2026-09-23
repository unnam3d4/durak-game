import type { CSSProperties } from "react";
import { TURN_LIMIT_MS } from "../timer/turn-timer";

type Props = Readonly<{ remainingMs: number; paused?: boolean }>;

export function TurnTimer({ remainingMs, paused = false }: Props) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const degrees = Math.max(0, Math.min(360, (remainingMs / TURN_LIMIT_MS) * 360));
  const style = { "--timer-angle": `${degrees}deg` } as CSSProperties;

  return (
    <div
      className={`turn-timer${remainingMs <= 5000 ? " turn-timer--urgent" : ""}${paused ? " turn-timer--paused" : ""}`}
      style={style}
      aria-label={paused ? "Таймер приостановлен" : `Осталось ${seconds} секунд`}
    >
      <div className="turn-timer__inner"><strong data-testid="turn-seconds">{seconds}</strong><span>сек</span></div>
    </div>
  );
}
