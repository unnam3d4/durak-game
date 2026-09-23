import type { PublicGameView } from "../core/public-view";
import type { GameAction } from "../rules/legal-actions";
import type { PlayerController } from "./player-controller";

export class HumanController implements PlayerController {
  private resolver: ((action: GameAction) => void) | null = null;

  requestAction(_view: PublicGameView): Promise<GameAction> {
    if (this.resolver) {
      throw new Error("Human action is already pending");
    }
    return new Promise<GameAction>((resolve) => {
      this.resolver = resolve;
    });
  }

  submitAction(action: GameAction): void {
    if (!this.resolver) {
      throw new Error("No human action is pending");
    }
    const resolve = this.resolver;
    this.resolver = null;
    resolve(action);
  }
}
