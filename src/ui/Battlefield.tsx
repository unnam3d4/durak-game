import type { Card } from "../core/cards";
import type { TablePair } from "../core/game-types";
import {
  t,
  type Language
} from "../i18n/i18n";
import { CardView } from "./CardView";

const SUIT_SYMBOLS: Readonly<Record<Card["suit"], string>> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

type Props = Readonly<{
  talonCount: number;
  discardCount: number;
  trumpCard: Card;
  table: readonly TablePair[];
  targetableAttackIds: ReadonlySet<string>;
  interactionBlocked: boolean;
  hiddenCardIds?: ReadonlySet<string>;
  transferAvailable?: boolean;
  transferSelectedCount?: number;
  onTransferSelected?: () => void;
  onAttackTarget: (attackCardId: string) => void;
  lang?: Language;
}>;

export function Battlefield({
  talonCount,
  discardCount,
  trumpCard,
  table,
  targetableAttackIds,
  interactionBlocked,
  hiddenCardIds = new Set<string>(),
  transferAvailable = false,
  transferSelectedCount = 0,
  onTransferSelected,
  onAttackTarget,
  lang = "ru"
}: Props) {
  return (
    <section className="table-area multiplayer-table-area">
      <div className="table-side-piles">
        <div className="deck-area">
          <div
            className={`deck-stack${talonCount === 0 ? " deck-stack--empty" : ""}`}
            data-talon-source="true"
          >
            {talonCount > 1 ? (
              <CardView back compact lang={lang} />
            ) : null}
            {talonCount > 0 ? (
              <span className="trump-card">
                <CardView
                  card={trumpCard}
                  compact
                  lang={lang}
                  testId="trump-card"
                />
              </span>
            ) : (
              <span
                className={`trump-suit-marker trump-suit-marker--${trumpCard.suit}`}
                data-testid="trump-suit-marker"
                aria-label={`${t(lang, "trump")} ${SUIT_SYMBOLS[trumpCard.suit]}`}
              >
                <small>{t(lang, "trumpLower")}</small>
                <b>{SUIT_SYMBOLS[trumpCard.suit]}</b>
              </span>
            )}
          </div>
          <div className="deck-count">
            <b data-testid="talon-count">{talonCount}</b>
            <small>{t(lang, "inDeck")}</small>
          </div>
        </div>

        <div
          className={`beaten-pile${discardCount > 0 ? " beaten-pile--filled" : ""}`}
          data-discard-target="true"
          data-testid="beaten-pile"
          aria-label={
            lang === "ru"
              ? `Бито: ${discardCount} карт`
              : `Discarded: ${discardCount} cards`
          }
        >
          <div className="beaten-pile__cards" aria-hidden="true">
            {discardCount > 0 ? (
              <>
                <span><CardView back compact lang={lang} /></span>
                {discardCount > 2 ? (
                  <span><CardView back compact lang={lang} /></span>
                ) : null}
                {discardCount > 6 ? (
                  <span><CardView back compact lang={lang} /></span>
                ) : null}
              </>
            ) : (
              <span className="beaten-pile__empty">—</span>
            )}
          </div>
          <strong>{lang === "ru" ? "Бито" : "Discard"}</strong>
          <small>{discardCount}</small>
        </div>
      </div>

      <div className="battlefield" data-drop-battlefield="true">
        {transferAvailable ? (
          <button
            type="button"
            className={`transfer-slot${transferSelectedCount > 0 ? " transfer-slot--ready" : ""}`}
            data-drop-transfer="true"
            data-testid="transfer-slot"
            disabled={interactionBlocked || transferSelectedCount === 0}
            onClick={onTransferSelected}
          >
            <span>{lang === "ru" ? "Перевод" : "Transfer"}</span>
            <small>
              {transferSelectedCount > 0
                ? (lang === "ru"
                    ? `${transferSelectedCount} выбрано`
                    : `${transferSelectedCount} selected`)
                : (lang === "ru"
                    ? "Перетащите карту сюда"
                    : "Drag a card here")}
            </small>
          </button>
        ) : null}

        {table.length === 0 ? (
          <div className="empty-table">
            <span>{t(lang, "tableFree")}</span>
          </div>
        ) : (
          table.map((pair) => {
            const targetable =
              pair.defense === undefined &&
              targetableAttackIds.has(pair.attack.id);

            return (
              <div className="card-pair" key={pair.attack.id}>
                <CardView
                  card={pair.attack}
                  compact
                  lang={lang}
                  playable={targetable && !interactionBlocked}
                  onClick={
                    targetable
                      ? () => onAttackTarget(pair.attack.id)
                      : undefined
                  }
                  dropTargetAttackId={
                    pair.defense === undefined
                      ? pair.attack.id
                      : undefined
                  }
                  style={
                    hiddenCardIds.has(pair.attack.id)
                      ? { visibility: "hidden" }
                      : undefined
                  }
                  testId={`attack-${pair.attack.id}`}
                />
                {pair.defense ? (
                  <span className="defense-card">
                    <CardView
                      card={pair.defense}
                      compact
                      lang={lang}
                      style={
                        hiddenCardIds.has(pair.defense.id)
                          ? { visibility: "hidden" }
                          : undefined
                      }
                      testId={`defense-${pair.attack.id}`}
                    />
                  </span>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
