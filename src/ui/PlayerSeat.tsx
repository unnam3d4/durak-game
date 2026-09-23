import { CardView } from "./CardView";

type Props = Readonly<{
  name: string;
  cardCount: number;
  active: boolean;
  opponent?: boolean;
}>;

function cardsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return "карта";
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return "карты";
  return "карт";
}

export function PlayerSeat({ name, cardCount, active, opponent = false }: Props) {
  return (
    <section className={`player-seat${active ? " player-seat--active" : ""}`}>
      <div className="player-seat__meta">
        <div>
          <strong>{name}</strong>
          <span className="player-seat__rank">10 разряд</span>
        </div>
        <span className="player-seat__count">{cardCount} {cardsWord(cardCount)}</span>
      </div>
      {opponent && (
        <div className="opponent-hand" aria-label={`У соперника карт: ${cardCount}`}>
          {Array.from({ length: Math.min(cardCount, 7) }, (_, index) => (
            <span className="opponent-hand__slot" style={{ left: `${index * 18}px`, transform: `rotate(${(index - 3) * 1.4}deg)` }} key={index}>
              <CardView back compact />
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
