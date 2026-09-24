import type { MultiplayerPublicView } from "../core/multiplayer-public-view";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";

export type CardDropTarget =
  | Readonly<{ type: "battlefield" }>
  | Readonly<{ type: "transfer" }>
  | Readonly<{ type: "attack-card"; attackCardId: string }>;

export function resolveCardDropAction(
  view: MultiplayerPublicView,
  cardId: string,
  target: CardDropTarget
): MultiplayerGameAction | undefined {
  if (target.type === "battlefield") {
    return view.legalActions.find(
      (action) =>
        action.type === "play-attack" &&
        action.cardId === cardId
    );
  }

  if (target.type === "transfer") {
    return view.legalActions.find(
      (action) =>
        action.type === "transfer" &&
        action.cardIds.length === 1 &&
        action.cardIds[0] === cardId
    );
  }

  return view.legalActions.find(
    (action) =>
      action.type === "play-defense" &&
      action.cardId === cardId &&
      action.attackCardId === target.attackCardId
  );
}
