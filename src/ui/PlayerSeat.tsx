import {
  cardsLabel,
  t,
  type Language
} from "../i18n/i18n";
import { CardView } from "./CardView";
import { TurnTimer } from "./TurnTimer";

type Props = Readonly<{
  name: string;
  cardCount: number;
  active: boolean;
  opponent?: boolean;
  turnStatus?: string;
  remainingMs?: number;
  timerPaused?: boolean;
  lang?: Language;
}>;

export function PlayerSeat({
  name,
  cardCount,
  active,
  opponent = false,
  turnStatus,
  remainingMs,
  timerPaused = false,
  lang = "ru"
}: Props) {
  return (
    <section className={`player-seat${active ? " player-seat--active" : ""}`}>
      <div className="player-seat__meta">
        <div>
          <strong>{name}</strong>
        </div>
        <span className="player-seat__count">
          {cardsLabel(lang, cardCount)}
        </span>
      </div>

      {turnStatus || remainingMs !== undefined ? (
        <div className="player-seat__turn" aria-live="polite">
          {turnStatus ? (
            <span className="player-seat__turn-label">
              <i aria-hidden="true" />
              {turnStatus}
            </span>
          ) : null}
          {remainingMs !== undefined ? (
            <TurnTimer
              remainingMs={remainingMs}
              paused={timerPaused}
              lang={lang}
            />
          ) : null}
        </div>
      ) : null}

      {opponent && (
        <div
          className="opponent-hand"
          aria-label={t(lang, "opponentCards", { count: cardCount })}
        >
          {Array.from(
            { length: Math.min(cardCount, 7) },
            (_, index) => (
              <span
                className="opponent-hand__slot"
                style={{
                  left: `${index * 18}px`,
                  transform: `rotate(${(index - 3) * 1.4}deg)`
                }}
                key={index}
              >
                <CardView back compact lang={lang} />
              </span>
            )
          )}
        </div>
      )}
    </section>
  );
}
