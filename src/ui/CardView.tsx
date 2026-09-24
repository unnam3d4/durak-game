import type {
  CSSProperties,
  MouseEventHandler,
  PointerEventHandler
} from "react";
import type { Card } from "../core/cards";
import {
  cardRankLabel,
  suitName,
  t,
  type Language
} from "../i18n/i18n";

const symbols = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
} as const;

const courtGlyphs = {
  clubs: { 11: "⚔", 12: "♧", 13: "♜" },
  diamonds: { 11: "✦", 12: "◇", 13: "♢" },
  hearts: { 11: "❦", 12: "♡", 13: "♥" },
  spades: { 11: "♞", 12: "♤", 13: "♠" }
} as const;

type Props = Readonly<{
  card?: Card;
  back?: boolean;
  compact?: boolean;
  playable?: boolean;
  selected?: boolean;
  testId?: string;
  style?: CSSProperties;
  dropTargetAttackId?: string;
  lang?: Language;
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
  lang = "ru",
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
          <span>{t(lang, "cardBackMark")}</span>
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
    `card--${card.suit}`,
    playable && "card--playable",
    selected && "card--selected"
  ]
    .filter(Boolean)
    .join(" ");
  const rank = cardRankLabel(lang, card.rank);
  const ariaLabel = `${rank} ${suitName(lang, card.suit)}`;
  const pipCount = card.rank >= 6 && card.rank <= 10 ? card.rank : 0;
  const courtMark =
    card.rank === 11 || card.rank === 12 || card.rank === 13
      ? courtGlyphs[card.suit][card.rank]
      : card.rank === 14
        ? symbols[card.suit]
        : null;
  const content = (
    <>
      <span className="card-corner card-corner--top">
        <b>{rank}</b>
        <i>{symbols[card.suit]}</i>
      </span>
      {pipCount > 0 ? (
        <span className={`card-pips card-pips--${pipCount}`} aria-hidden="true">
          {Array.from({ length: pipCount }, (_, index) => (
            <i key={index}>{symbols[card.suit]}</i>
          ))}
        </span>
      ) : (
        <span
          className={`card-face card-face--${card.rank}`}
          aria-hidden="true"
        >
          <i>{courtMark}</i>
          <b>{rank}</b>
          <em>{symbols[card.suit]}</em>
        </span>
      )}
      <span className="card-corner card-corner--bottom">
        <b>{rank}</b>
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
