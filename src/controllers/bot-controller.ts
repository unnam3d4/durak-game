import type { Card } from "../core/cards";
import type { PublicGameView } from "../core/public-view";
import type { GameAction } from "../rules/legal-actions";
import type { RandomSource } from "../deck/random";
import type { PlayerController } from "./player-controller";

function cardForAction(view: PublicGameView, action: GameAction): Card | undefined {
  if (action.type !== "play-attack" && action.type !== "play-defense") return undefined;
  return view.ownHand.find((card) => card.id === action.cardId);
}

function currentUnbeatenAttack(view: PublicGameView): Card | undefined {
  return view.table.find((pair) => pair.defense === undefined)?.attack;
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

function rankValue(card: Card): number {
  return (card.rank - 6) / 8;
}

function trumpCount(view: PublicGameView): number {
  return view.ownHand.filter((card) => card.suit === view.trumpCard.suit).length;
}

/**
 * Higher score means the defense spends a more strategically valuable card.
 * This deliberately uses only information available in PublicGameView.
 */
function defenseCost(view: PublicGameView, defense: GameAction): number {
  const card = cardForAction(view, defense);
  const attack = currentUnbeatenAttack(view);
  if (!card || !attack) return Number.POSITIVE_INFINITY;

  const isTrump = card.suit === view.trumpCard.suit;
  const attackIsTrump = attack.suit === view.trumpCard.suit;
  const lateGame = view.talonCount === 0;
  const opponentCount = view.opponentCardCounts[
    view.viewerId === "human" ? "bot" : "human"
  ];

  let cost = rankValue(card) * 3;

  if (isTrump) {
    cost += 4.2;
    if (trumpCount(view) === 1) cost += 1.6;
    if (view.talonCount > 0) cost += 1.2;
    if (attackIsTrump) cost -= 0.7;
  }

  // Once replenishment has stopped, tempo matters more than hoarding strong cards.
  if (lateGame) cost -= 2.2;
  if (lateGame && view.ownHand.length <= 3) cost -= 1.3;
  if (lateGame && opponentCount <= 2) cost -= 1.2;

  return cost;
}

/**
 * Higher score means picking up the table is more painful.
 * The estimate includes already played cards and some risk of legal throw-ins.
 */
function takeCost(view: PublicGameView): number {
  const attack = currentUnbeatenAttack(view);
  const tableCards = view.table.reduce(
    (sum, pair) => sum + 1 + (pair.defense ? 1 : 0),
    0
  );
  const cap = Math.min(6, view.ownHand.length + tableCards);
  const possibleExtraAttacks = Math.max(0, cap - view.table.length);
  const opponentCount = view.opponentCardCounts[
    view.viewerId === "human" ? "bot" : "human"
  ];

  let cost = tableCards * 1.7 + Math.min(2.4, possibleExtraAttacks * 0.55);

  if (view.ownHand.length >= 6) cost += 1.3;
  if (view.talonCount === 0) cost += 3.2;
  if (view.talonCount === 0 && opponentCount <= 2) cost += 2.2;

  // Taking a trump attack preserves our higher trump and adds the attacking
  // trump to our hand, which can be rational early in the deal.
  if (attack?.suit === view.trumpCard.suit && view.talonCount > 0) cost -= 1.0;

  return cost;
}

function chooseDefense(view: PublicGameView, actions: readonly GameAction[]): GameAction | undefined {
  const defenses = actions
    .filter((action): action is Extract<GameAction, { type: "play-defense" }> =>
      action.type === "play-defense"
    )
    .sort((a, b) => {
      const costDelta = defenseCost(view, a) - defenseCost(view, b);
      return costDelta !== 0 ? costDelta : comparePlayableCards(view, a, b);
    });
  const take = actions.find((action) => action.type === "take");

  if (defenses.length === 0) return take;

  const cheapestDefense = defenses[0]!;
  if (take && defenseCost(view, cheapestDefense) > takeCost(view)) {
    return take;
  }

  return cheapestDefense;
}

export class BotController implements PlayerController {
  constructor(private readonly random: RandomSource = Math.random) {}

  async requestAction(view: PublicGameView): Promise<GameAction> {
    const actions = [...view.legalActions];
    if (actions.length === 0) throw new Error("Bot has no legal action");
    if (actions.length === 1) return actions[0]!;

    if (view.phase === "defend") {
      const defense = chooseDefense(view, actions);
      if (defense) return defense;
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
