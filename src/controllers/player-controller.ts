import type { PublicGameView } from "../core/public-view";
import type { GameAction } from "../rules/legal-actions";

export interface PlayerController {
  requestAction(view: PublicGameView): Promise<GameAction>;
}
