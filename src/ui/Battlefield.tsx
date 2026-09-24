import type { Card } from "../core/cards";
import type { TablePair } from "../core/game-types";
import { CardView } from "./CardView";

const SUIT_SYMBOLS: Readonly<Record<Card["suit"], string>> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

type Props = Readonly<{
  talonCount: number;
  trumpCard: Card;
  table: readonly TablePair[];
  status: string;
  targetableAttackIds: ReadonlySet<string>;
  interactionBlocked: boolean;
  hiddenCardIds?: ReadonlySet<string>;
  onAttackTarget: (attackCardId: string) => void;
}>;

export function Battlefield({
  talonCount,
  trumpCard,
  table,
  status,
  targetableAttackIds,
  interactionBlocked,
  hiddenCardIds = new Set<string>(),
  onAttackTarget
}: Props) {
  return (
    <section className="table-area multiplayer-table-area">
      <div className="deck-area">
        <div className="deck-stack" data-talon-source="true">
          {talonCount > 1 ? <CardView back compact /> : null}
          {talonCount > 0 ? (
            <span className="trump-card">
              <CardView
                card={trumpCard}
                compact
                testId="trump-card"
              />
            </span>
          ) : (
            <span
              className={`trump-suit-marker trump-suit-marker--${trumpCard.suit}`}
              data-testid="trump-suit-marker"
              aria-label={`Козырь ${SUIT_SYMBOLS[trumpCard.suit]}`}
            >
              <small>козырь</small>
              <b>{SUIT_SYMBOLS[trumpCard.suit]}</b>
            </span>
          )}
        </div>
        <b data-testid="talon-count">{talonCount}</b>
        <small>в колоде</small>
        <div
          className="discard-pile"
          data-discard-target="true"
          aria-hidden="true"
        >
          <CardView back compact />
        </div>
      </div>

      <div className="battlefield" data-drop-battlefield="true">
        {table.length === 0 ? (
          <div className="empty-table">
            <span>Стол свободен</span>
            <small>{status}</small>
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
