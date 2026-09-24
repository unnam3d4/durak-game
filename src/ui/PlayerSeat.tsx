import {
  cardsLabel,
  t,
  type Language
} from "../i18n/i18n";
import { CardView } from "./CardView";

type Props = Readonly<{
  name: string;
  cardCount: number;
  active: boolean;
  opponent?: boolean;
  lang?: Language;
}>;

export function PlayerSeat({
  name,
  cardCount,
  active,
  opponent = false,
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
