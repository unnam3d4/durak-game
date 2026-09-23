import type { Card } from "../core/cards";
import type { PublicGameView } from "../core/public-view";
import type { GameAction } from "../rules/legal-actions";
import type { RandomSource } from "../deck/random";
import type { PlayerController } from "./player-controller";

export type BotProfile = Readonly<{
  name: "casual" | "standard" | "strong";
  mistakeRate: number;
  trumpConservation: number;
  pairPreference: number;
  endgameUrgency: number;
}>;

export const BOT_PROFILES: Readonly<Record<BotProfile["name"], BotProfile>> = {
  casual: {
    name: "casual",
    mistakeRate: 0.18,
    trumpConservation: 0.72,
    pairPreference: 0.7,
    endgameUrgency: 0.75
  },
  standard: {
    name: "standard",
    mistakeRate: 0.06,
    trumpConservation: 1,
    pairPreference: 1,
    endgameUrgency: 1
  },
  strong: {
    name: "strong",
    mistakeRate: 0,
    trumpConservation: 1.15,
    pairPreference: 1.12,
    endgameUrgency: 1.15
  }
};

function cardForAction(view: PublicGameView, action: GameAction): Card | undefined {
  if (action.type !== "play-attack" && action.type !== "play-defense") return undefined;
  return view.ownHand.find((card) => card.id === action.cardId);
}

function currentUnbeatenAttack(view: PublicGameView): Card | undefined {
  return view.table.find((pair) => pair.defense === undefined)?.attack;
}

function opponentCardCount(view: PublicGameView): number {
  return view.opponentCardCounts[view.viewerId === "human" ? "bot" : "human"];
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

function sameRankCount(view: PublicGameView, card: Card): number {
  return view.ownHand.filter((candidate) => candidate.rank === card.rank).length;
}

/**
 * Lower score is a better opening lead. The bot protects trumps and prefers
 * ranks it owns in pairs, especially when the defender is close to going out.
 */
function openingAttackCost(
  view: PublicGameView,
  action: GameAction,
  profile: BotProfile
): number {
  const card = cardForAction(view, action);
  if (!card) return Number.POSITIVE_INFINITY;

  const isTrump = card.suit === view.trumpCard.suit;
  const pairBonus =
    Math.max(0, sameRankCount(view, card) - 1) *
    2.5 *
    profile.pairPreference *
    (opponentCardCount(view) <= 3 ? 1.25 : 1);
  const trumpPenalty =
    (isTrump ? (view.talonCount > 0 ? 8 : 4) : 0) *
    profile.trumpConservation;

  return rankValue(card) * 3 + trumpPenalty - pairBonus;
}

function chooseThrowIn(
  view: PublicGameView,
  actions: readonly GameAction[],
  profile: BotProfile
): GameAction | undefined {
  const throwIns = actions.filter(
    (action): action is Extract<GameAction, { type: "play-attack" }> =>
      action.type === "play-attack"
  );
  const finish = actions.find((action) => action.type === "finish-bout");
  if (throwIns.length === 0) return finish;

  const nonTrumps = throwIns.filter(
    (action) => cardForAction(view, action)?.suit !== view.trumpCard.suit
  );

  if (view.phase === "taking") {
    // Once the defender has committed to taking, unload the most expensive
    // legal non-trump. Trumps are still protected until the endgame.
    if (nonTrumps.length > 0) {
      return nonTrumps.sort((a, b) => {
        const cardA = cardForAction(view, a)!;
        const cardB = cardForAction(view, b)!;
        return cardB.rank - cardA.rank;
      })[0];
    }

    if (
      view.talonCount === 0 ||
      view.ownHand.length <= 2 ||
      (profile.endgameUrgency > 1 && view.ownHand.length <= 3)
    ) {
      return throwIns.sort((a, b) => comparePlayableCards(view, a, b))[0];
    }
    return finish;
  }

  // While the defender is still beating cards, apply pressure with cheap
  // non-trumps. Valuable trumps are kept unless the stock is exhausted.
  if (nonTrumps.length > 0) {
    return nonTrumps.sort((a, b) => comparePlayableCards(view, a, b))[0];
  }
  if (
    view.talonCount === 0 &&
    (view.ownHand.length <= 3 || profile.endgameUrgency > 1)
  ) {
    return throwIns.sort((a, b) => comparePlayableCards(view, a, b))[0];
  }
  return finish;
}

/**
 * Higher score means the defense spends a more strategically valuable card.
 * Only information present in PublicGameView is used.
 */
function defenseCost(
  view: PublicGameView,
  defense: GameAction,
  profile: BotProfile
): number {
  const card = cardForAction(view, defense);
  const attack = currentUnbeatenAttack(view);
  if (!card || !attack) return Number.POSITIVE_INFINITY;

  const isTrump = card.suit === view.trumpCard.suit;
  const attackIsTrump = attack.suit === view.trumpCard.suit;
  const lateGame = view.talonCount === 0;
  const opponentCount = opponentCardCount(view);

  let cost = rankValue(card) * 3;

  if (isTrump) {
    cost += 4.2 * profile.trumpConservation;
    if (trumpCount(view) === 1) cost += 1.6 * profile.trumpConservation;
    if (view.talonCount > 0) cost += 1.2 * profile.trumpConservation;
    if (attackIsTrump) cost -= 0.7;
  }

  if (lateGame) cost -= 2.2 * profile.endgameUrgency;
  if (lateGame && view.ownHand.length <= 3) {
    cost -= 1.3 * profile.endgameUrgency;
  }
  if (lateGame && opponentCount <= 2) {
    cost -= 1.2 * profile.endgameUrgency;
  }

  return cost;
}

/**
 * Higher score means picking up the table is more painful. This includes the
 * visible cards plus a conservative allowance for legal follow-up throw-ins.
 */
function takeCost(view: PublicGameView, profile: BotProfile): number {
  const attack = currentUnbeatenAttack(view);
  const tableCards = view.table.reduce(
    (sum, pair) => sum + 1 + (pair.defense ? 1 : 0),
    0
  );
  const cap = Math.min(6, view.ownHand.length + tableCards);
  const possibleExtraAttacks = Math.max(0, cap - view.table.length);
  const opponentCount = opponentCardCount(view);

  let cost = tableCards * 1.7 + Math.min(2.4, possibleExtraAttacks * 0.55);

  if (view.ownHand.length >= 6) cost += 1.3;
  if (view.talonCount === 0) cost += 3.2 * profile.endgameUrgency;
  if (view.talonCount === 0 && opponentCount <= 2) {
    cost += 2.2 * profile.endgameUrgency;
  }

  // Early in the game it can be rational to pick up a low attacking trump
  // instead of spending a much stronger trump to beat it.
  if (attack?.suit === view.trumpCard.suit && view.talonCount > 0) cost -= 1.0;

  return cost;
}

function chooseDefense(
  view: PublicGameView,
  actions: readonly GameAction[],
  profile: BotProfile
): GameAction | undefined {
  const defenses = actions
    .filter((action): action is Extract<GameAction, { type: "play-defense" }> =>
      action.type === "play-defense"
    )
    .sort((a, b) => {
      const costDelta =
        defenseCost(view, a, profile) - defenseCost(view, b, profile);
      return costDelta !== 0 ? costDelta : comparePlayableCards(view, a, b);
    });
  const take = actions.find((action) => action.type === "take");

  if (defenses.length === 0) return take;

  const cheapestDefense = defenses[0]!;
  if (
    take &&
    defenseCost(view, cheapestDefense, profile) > takeCost(view, profile)
  ) {
    return take;
  }

  return cheapestDefense;
}

export class BotController implements PlayerController {
  constructor(
    private readonly random: RandomSource = Math.random,
    private readonly profile: BotProfile = BOT_PROFILES.standard
  ) {}

  async requestAction(view: PublicGameView): Promise<GameAction> {
    const actions = [...view.legalActions];
    if (actions.length === 0) throw new Error("Bot has no legal action");
    if (actions.length === 1) return actions[0]!;

    // Difficulty affects decisions only. It never changes the deal and never
    // exposes hidden cards. Even a deliberate mistake is still a legal move.
    if (this.random() < this.profile.mistakeRate) {
      const index = Math.min(
        actions.length - 1,
        Math.floor(this.random() * actions.length)
      );
      return actions[index]!;
    }

    if (view.phase === "defend") {
      const defense = chooseDefense(view, actions, this.profile);
      if (defense) return defense;
    }

    if (view.phase === "attack") {
      const attacks = actions
        .filter((action): action is Extract<GameAction, { type: "play-attack" }> =>
          action.type === "play-attack"
        )
        .sort((a, b) => {
          const costDelta =
            openingAttackCost(view, a, this.profile) -
            openingAttackCost(view, b, this.profile);
          return costDelta !== 0 ? costDelta : comparePlayableCards(view, a, b);
        });
      if (attacks.length > 0) return attacks[0]!;
    }

    if (view.phase === "throw-in" || view.phase === "taking") {
      const throwIn = chooseThrowIn(view, actions, this.profile);
      if (throwIn) return throwIn;
    }

    const index = Math.min(
      actions.length - 1,
      Math.floor(this.random() * actions.length)
    );
    return actions[index]!;
  }
}
