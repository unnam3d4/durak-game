import type { CSSProperties } from "react";
import type { Card } from "../core/cards";
import { CardView } from "./CardView";
import { useCardDrag } from "./use-card-drag";

export type HumanCardDropPoint = Readonly<{
  x: number;
  y: number;
}>;

type DraggableCardProps = Readonly<{
  card: Card;
  fan: number;
  playable: boolean;
  selected: boolean;
  onTap: () => void;
  onDrop: (point: HumanCardDropPoint) => void;
}>;

function DraggableCard({
  card,
  fan,
  playable,
  selected,
  onTap,
  onDrop
}: DraggableCardProps) {
  const drag = useCardDrag({
    thresholdPx: 8,
    onTap,
    onDrop
  });
  const dx = drag.x - drag.startX;
  const dy = drag.y - drag.startY;

  return (
    <span
      className="human-card-slot"
      style={{ "--fan": fan } as CSSProperties}
    >
      <CardView
        card={card}
        playable={playable}
        selected={selected}
        onClick={(event) => {
          if (event.detail === 0) onTap();
        }}
        onPointerDown={drag.handlers.onPointerDown}
        onPointerMove={drag.handlers.onPointerMove}
        onPointerUp={drag.handlers.onPointerUp}
        onPointerCancel={drag.handlers.onPointerCancel}
        onLostPointerCapture={drag.handlers.onLostPointerCapture}
        style={{
          touchAction: playable ? "none" : undefined,
          position: drag.dragging ? "relative" : undefined,
          zIndex: drag.dragging ? 20 : undefined,
          transform: drag.dragging
            ? `translate(${dx}px, ${dy}px) scale(1.06)`
            : undefined
        }}
        testId="human-card"
      />
    </span>
  );
}

type Props = Readonly<{
  cards: readonly Card[];
  interactive: boolean;
  playableIds: ReadonlySet<string>;
  selectedAttackIds: readonly string[];
  selectedDefenseId: string | null;
  onTapCard: (card: Card) => void;
  onDropCard: (cardId: string, point: HumanCardDropPoint) => void;
}>;

export function HumanHand({
  cards,
  interactive,
  playableIds,
  selectedAttackIds,
  selectedDefenseId,
  onTapCard,
  onDropCard
}: Props) {
  return (
    <div className="human-hand" aria-label="Ваши карты">
      {cards.map((card, index) => {
        const fan = index - (cards.length - 1) / 2;
        return (
          <DraggableCard
            key={card.id}
            card={card}
            fan={fan}
            playable={interactive && playableIds.has(card.id)}
            selected={
              selectedAttackIds.includes(card.id) ||
              selectedDefenseId === card.id
            }
            onTap={() => onTapCard(card)}
            onDrop={(point) => onDropCard(card.id, point)}
          />
        );
      })}
    </div>
  );
}
