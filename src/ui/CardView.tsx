import type { Card } from "../core/cards";

const symbols = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" } as const;
const names = { clubs: "треф", diamonds: "бубен", hearts: "червей", spades: "пик" } as const;

function rankLabel(rank: Card["rank"]): string {
  if (rank <= 10) return String(rank);
  return ({ 11: "В", 12: "Д", 13: "К", 14: "Т" } as const)[rank];
}

type Props = Readonly<{
  card?: Card;
  back?: boolean;
  compact?: boolean;
  playable?: boolean;
  testId?: string;
  onClick?: () => void;
}>;

export function CardView({
  card,
  back = false,
  compact = false,
  playable = false,
  testId,
  onClick
}: Props) {
  if (back) {
    return (
      <div className={`card card--back${compact ? " card--compact" : ""}`} data-testid={testId}>
        <span className="card-back__frame"><span>Д</span></span>
      </div>
    );
  }
  if (!card) return null;

  const red = card.suit === "hearts" || card.suit === "diamonds";
  const classes = ["card", compact && "card--compact", red && "card--red", playable && "card--playable"]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className="card-corner card-corner--top"><b>{rankLabel(card.rank)}</b><i>{symbols[card.suit]}</i></span>
      <span className="card-suit">{symbols[card.suit]}</span>
      <span className="card-corner card-corner--bottom"><b>{rankLabel(card.rank)}</b><i>{symbols[card.suit]}</i></span>
    </>
  );

  return onClick ? (
    <button
      type="button"
      className={classes}
      aria-label={`${rankLabel(card.rank)} ${names[card.suit]}`}
      disabled={!playable}
      onClick={onClick}
      data-testid={testId}
    >
      {content}
    </button>
  ) : (
    <div className={classes} aria-label={`${rankLabel(card.rank)} ${names[card.suit]}`} data-testid={testId}>
      {content}
    </div>
  );
}
