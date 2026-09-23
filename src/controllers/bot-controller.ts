import type { Card } from "../core/cards";
import type { PublicGameView } from "../core/public-view";
import type { GameAction } from "../rules/legal-actions";
import type { RandomSource } from "../deck/random";
import type { PlayerController } from "./player-controller";

function cardForAction(view: PublicGameView, action: GameAction): Card | undefined {
  if (action.type !== "play-attack" && action.type !== "play-defense") return undefined;
  return view.ownHand.find((card) => card.id === action.cardId);
}

function comparePlayableCards(view: PublicGameView, a: GameAction, b: GameAction): number {
  const cardA = cardForAction(view, a);
  const cardB = cardForAction(view, b);
  if (!cardA || !cardB) return 0;

  const aTrump = cardA.suit === view.trumpCard.suit ? 1 : 0;
  const bTrump = cardB.suit === view.trumpCard.suit ? 1 : 0;
  if (aTrump !== bTrump) return aTrump - bTrump;
  return cardA.rank - cardB.rank;
}

export class BotController implements PlayerController {
  constructor(private readonly random: RandomSource = Math.random) {}

  async requestAction(view: PublicGameView): Promise<GameAction> {
    const actions = [...view.legalActions];
    if (actions.length === 0) throw new Error("Bot has no legal action");
    if (actions.length === 1) return actions[0]!;

    if (view.phase === "defend") {
      const defenses = actions
        .filter((action): action is Extract<GameAction, { type: "play-defense" }> => action.type === "play-defense")
        .sort((a, b) => comparePlayableCards(view, a, b));
      if (defenses.length > 0) return defenses[0]!;
      const take = actions.find((action) => action.type === "take");
      if (take) return take;
    }

    if (view.phase === "attack") {
      const attacks = actions
        .filter((action): action is Extract<GameAction, { type: "play-attack" }> => action.type === "play-attack")
        .sort((a, b) => comparePlayableCards(view, a, b));
      if (attacks.length > 0) return attacks[0]!;
    }

    if (view.phase === "throw-in") {
      const lowThrowIns = actions
        .filter((action): action is Extract<GameAction, { type: "play-attack" }> => action.type === "play-attack")
        .filter((action) => (cardForAction(view, action)?.rank ?? 99) <= 10)
        .sort((a, b) => comparePlayableCards(view, a, b));
      if (lowThrowIns.length > 0) return lowThrowIns[0]!;
      const finish = actions.find((action) => action.type === "finish-bout");
      if (finish) return finish;
    }

    const index = Math.min(actions.length - 1, Math.floor(this.random() * actions.length));
    return actions[index]!;
  }
}
