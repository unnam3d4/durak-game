import type {
  CSSProperties,
  MouseEventHandler,
  PointerEventHandler
} from "react";
import type { Card } from "../core/cards";

const symbols = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
} as const;
const names = {
  clubs: "треф",
  diamonds: "бубен",
  hearts: "червей",
  spades: "пик"
} as const;

function rankLabel(rank: Card["rank"]): string {
  switch (rank) {
    case 11:
      return "В";
    case 12:
      return "Д";
    case 13:
      return "К";
    case 14:
      return "Т";
    default:
      return String(rank);
  }
}

type Props = Readonly<{
  card?: Card;
  back?: boolean;
  compact?: boolean;
  playable?: boolean;
  selected?: boolean;
  testId?: string;
  style?: CSSProperties;
  dropTargetAttackId?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onPointerMove?: PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: PointerEventHandler<HTMLButtonElement>;
  onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
  onLostPointerCapture?: PointerEventHandler<HTMLButtonElement>;
}>;

export function CardView({
  card,
  back = false,
  compact = false,
  playable = false,
  selected = false,
  testId,
  style,
  dropTargetAttackId,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture
}: Props) {
  if (back) {
    return (
      <div
        className={`card card--back${compact ? " card--compact" : ""}`}
        data-testid={testId}
      >
        <span className="card-back__frame">
          <span>Д</span>
        </span>
      </div>
    );
  }
  if (!card) return null;

  const red = card.suit === "hearts" || card.suit === "diamonds";
  const classes = [
    "card",
    compact && "card--compact",
    red && "card--red",
    playable && "card--playable",
    selected && "card--selected"
  ]
    .filter(Boolean)
    .join(" ");
  const ariaLabel = `${rankLabel(card.rank)} ${names[card.suit]}`;
  const content = (
    <>
      <span className="card-corner card-corner--top">
        <b>{rankLabel(card.rank)}</b>
        <i>{symbols[card.suit]}</i>
      </span>
      <span className="card-suit">{symbols[card.suit]}</span>
      <span className="card-corner card-corner--bottom">
        <b>{rankLabel(card.rank)}</b>
        <i>{symbols[card.suit]}</i>
      </span>
    </>
  );

  return onClick || onPointerDown ? (
    <button
      type="button"
      className={classes}
      aria-label={ariaLabel}
      disabled={!playable}
      aria-pressed={selected}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      style={style}
      data-card-id={card.id}
      data-drop-attack-id={dropTargetAttackId}
      data-testid={testId}
    >
      {content}
    </button>
  ) : (
    <div
      className={classes}
      aria-label={ariaLabel}
      style={style}
      data-card-id={card.id}
      data-drop-attack-id={dropTargetAttackId}
      data-testid={testId}
    >
      {content}
    </div>
  );
}
