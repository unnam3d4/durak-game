import type { Card } from "../core/cards";
import type { PublicGameView } from "../core/public-view";
import { canBeat, type GameAction } from "../rules/legal-actions";
import type { RandomSource } from "../deck/random";
import { BotMemory } from "./bot-memory";
import type { PlayerController } from "./player-controller";

export type BotSkill = "easy" | "normal" | "hard";

type BotProfile = Readonly<{
  mistakeRate: number;
  trumpConservation: number;
  pairPreference: number;
  pressure: number;
  memoryUse: number;
}>;

const BOT_PROFILES: Readonly<Record<BotSkill, BotProfile>> = {
  easy: {
    mistakeRate: 0.18,
    trumpConservation: 0.65,
    pairPreference: 0.65,
    pressure: 0.75,
    memoryUse: 0
  },
  normal: {
    mistakeRate: 0.06,
    trumpConservation: 1,
    pairPreference: 1,
    pressure: 1,
    memoryUse: 0.45
  },
  hard: {
    mistakeRate: 0,
    trumpConservation: 1.2,
    pairPreference: 1.15,
    pressure: 1.15,
    memoryUse: 1
  }
};

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

function sameRankCount(view: PublicGameView, card: Card): number {
  return view.ownHand.filter((candidate) => candidate.rank === card.rank).length;
}

/**
 * Lower score is a better opening lead. The bot protects trumps and prefers
 * ranks it can continue throwing in. Only public information is used.
 */
function openingAttackCost(
  view: PublicGameView,
  action: GameAction,
  profile: BotProfile,
  knownOpponentCards: readonly Card[],
  opponentSuitWeakness: ReadonlyMap<Card["suit"], number>
): number {
  const card = cardForAction(view, action);
  if (!card) return Number.POSITIVE_INFINITY;

  const isTrump = card.suit === view.trumpCard.suit;
  const opponentCount = view.opponentCardCounts[
    view.viewerId === "human" ? "bot" : "human"
  ];
  const pairBonus =
    Math.max(0, sameRankCount(view, card) - 1) *
    2.5 *
    profile.pairPreference *
    (opponentCount <= 3 ? 1.25 : 1);
  const trumpPenalty =
    (isTrump ? (view.talonCount > 0 ? 8 : 4) : 0) *
    profile.trumpConservation;

  const knownBeaters = knownOpponentCards.filter((known) =>
    canBeat(card, known, view.trumpCard.suit)
  ).length;
  const knownDefensePenalty =
    knownBeaters *
    1.35 *
    (view.talonCount === 0 ? 1.35 : 1) *
    profile.memoryUse;

  // Choosing to take is public evidence that a suit was awkward to defend.
  // It is only a tendency, never certainty: the opponent may have taken for
  // strategic reasons or drawn that suit later.
  const suitPressureBonus =
    knownBeaters === 0
      ? (opponentSuitWeakness.get(card.suit) ?? 0) *
        1.25 *
        (view.talonCount === 0 ? 1.4 : 0.65) *
        profile.memoryUse
      : 0;

  return (
    rankValue(card) * 3 +
    trumpPenalty -
    pairBonus +
    knownDefensePenalty -
    suitPressureBonus
  );
}

function openingActionCost(
  view: PublicGameView,
  action: Extract<GameAction, { type: "play-attack" | "play-attack-set" }>,
  profile: BotProfile,
  knownOpponentCards: readonly Card[],
  opponentSuitWeakness: ReadonlyMap<Card["suit"], number>
): number {
  if (action.type === "play-attack") {
    return openingAttackCost(
      view,
      action,
      profile,
      knownOpponentCards,
      opponentSuitWeakness
    );
  }

  const cards = action.cardIds
    .map((id) => view.ownHand.find((card) => card.id === id))
    .filter((card): card is Card => card !== undefined);
  if (cards.length !== action.cardIds.length || cards.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  const firstAsSingle: Extract<GameAction, { type: "play-attack" }> = {
    type: "play-attack",
    playerId: action.playerId,
    cardId: cards[0]!.id
  };
  let cost = openingAttackCost(
    view,
    firstAsSingle,
    profile,
    knownOpponentCards,
    opponentSuitWeakness
  );

  // Group attacks are mainly a tempo tool. They become especially valuable
  // after the talon is exhausted, and decisive when they empty the bot's hand.
  const tempoBonus =
    (cards.length - 1) *
    (view.talonCount === 0 ? 1.4 : 0.35) *
    profile.pressure;
  cost -= tempoBonus;

  if (view.talonCount === 0 && cards.length === view.ownHand.length) {
    cost -= 100;
  }

  return cost;
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
  const throwInSets = actions.filter(
    (action): action is Extract<GameAction, { type: "play-attack-set" }> =>
      action.type === "play-attack-set"
  );
  const finish = actions.find((action) => action.type === "finish-bout");
  if (throwIns.length === 0 && throwInSets.length === 0) return finish;

  const nonTrumps = throwIns.filter(
    (action) => cardForAction(view, action)?.suit !== view.trumpCard.suit
  );
  const nonTrumpSets = throwInSets.filter((action) =>
    action.cardIds.every((id) => {
      const card = view.ownHand.find((candidate) => candidate.id === id);
      return card && card.suit !== view.trumpCard.suit;
    })
  );
  const opponentCount = view.opponentCardCounts[
    view.viewerId === "human" ? "bot" : "human"
  ];

  // If the defender has played their last card, ending a successfully defended
  // bout can immediately lose the match. Use any legal throw-in to keep the
  // bout alive, even when the only option is a trump.
  if (
    view.phase === "throw-in" &&
    (opponentCount === 0 || (view.talonCount === 0 && opponentCount <= 1))
  ) {
    return throwIns.sort((a, b) => comparePlayableCards(view, a, b))[0];
  }

  if (view.phase === "taking") {
    // If the defender is already taking and a legal grouped throw-in can
    // empty the bot's hand with an empty talon, finish immediately even if
    // that set contains valuable trumps.
    if (view.talonCount === 0) {
      const finishingSet = throwInSets
        .filter((action) => action.cardIds.length === view.ownHand.length)
        .sort((a, b) => b.cardIds.length - a.cardIds.length)[0];
      if (finishingSet) return finishingSet;
    }

    // The defender has already committed to taking. If several legal
    // non-trumps can be shed together, do that in one visible move.
    if (nonTrumpSets.length > 0) {
      return nonTrumpSets.sort((a, b) => {
        if (a.cardIds.length !== b.cardIds.length) {
          return b.cardIds.length - a.cardIds.length;
        }
        const aValue = a.cardIds.reduce(
          (sum, id) =>
            sum + (view.ownHand.find((card) => card.id === id)?.rank ?? 0),
          0
        );
        const bValue = b.cardIds.reduce(
          (sum, id) =>
            sum + (view.ownHand.find((card) => card.id === id)?.rank ?? 0),
          0
        );
        return bValue - aValue;
      })[0];
    }

    // Otherwise shed an expensive legal non-trump, while keeping trumps when
    // the talon can still replenish hands.
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
      (profile.pressure > 1 && view.ownHand.length <= 3)
    ) {
      return throwIns.sort((a, b) => comparePlayableCards(view, a, b))[0];
    }
    return finish;
  }

  // During a defended bout, cheap non-trumps keep pressure without burning
  // valuable trumps. Hard bots become more aggressive in the endgame.
  if (nonTrumps.length > 0) {
    return nonTrumps.sort((a, b) => comparePlayableCards(view, a, b))[0];
  }
  if (
    view.talonCount === 0 &&
    (view.ownHand.length <= 3 || profile.pressure > 1)
  ) {
    return throwIns.sort((a, b) => comparePlayableCards(view, a, b))[0];
  }
  return finish;
}

/**
 * Higher score means the defense spends a more strategically valuable card.
 */
function defenseCost(
  view: PublicGameView,
  defense: GameAction,
  profile: BotProfile,
  knownOpponentCards: readonly Card[]
): number {
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
    cost += 4.2 * profile.trumpConservation;
    if (trumpCount(view) === 1) cost += 1.6 * profile.trumpConservation;
    if (view.talonCount > 0) cost += 1.2 * profile.trumpConservation;
    if (attackIsTrump) cost -= 0.7;
  }

  if (lateGame) cost -= 2.2 * profile.pressure;
  if (lateGame && view.ownHand.length <= 3) cost -= 1.3 * profile.pressure;
  if (lateGame && opponentCount <= 2) cost -= 1.2 * profile.pressure;

  // A remembered card that the opponent publicly picked up is fair
  // information. Avoid introducing its rank onto the table when another
  // defense is available, because that would enable a known throw-in.
  const visibleRanks = new Set(
    view.table.flatMap((pair) => [
      pair.attack.rank,
      ...(pair.defense ? [pair.defense.rank] : [])
    ])
  );
  if (!visibleRanks.has(card.rank)) {
    const knownMatchingRank = knownOpponentCards.filter(
      (known) => known.rank === card.rank
    ).length;
    cost += knownMatchingRank * 1.8 * profile.memoryUse;
  }

  return cost;
}

/**
 * Higher score means picking up the table is more painful.
 */
function takeCost(view: PublicGameView, profile: BotProfile): number {
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
  if (view.talonCount === 0) cost += 3.2 * profile.pressure;
  if (view.talonCount === 0 && opponentCount <= 2) {
    cost += 2.2 * profile.pressure;
  }

  // Early in the deal it can be rational to accept a low trump instead of
  // burning a much stronger trump to cover it.
  if (attack?.suit === view.trumpCard.suit && view.talonCount > 0) cost -= 1.0;

  return cost;
}

function chooseDefense(
  view: PublicGameView,
  actions: readonly GameAction[],
  profile: BotProfile,
  knownOpponentCards: readonly Card[]
): GameAction | undefined {
  const defenses = actions
    .filter((action): action is Extract<GameAction, { type: "play-defense" }> =>
      action.type === "play-defense"
    )
    .sort((a, b) => {
      const costDelta =
        defenseCost(view, a, profile, knownOpponentCards) -
        defenseCost(view, b, profile, knownOpponentCards);
      return costDelta !== 0 ? costDelta : comparePlayableCards(view, a, b);
    });
  const take = actions.find((action) => action.type === "take");

  if (defenses.length === 0) return take;

  const cheapestDefense = defenses[0]!;
  if (
    take &&
    defenseCost(view, cheapestDefense, profile, knownOpponentCards) >
      takeCost(view, profile)
  ) {
    return take;
  }

  return cheapestDefense;
}

export class BotController implements PlayerController {
  private readonly profile: BotProfile;
  private readonly memory = new BotMemory();

  constructor(
    private readonly random: RandomSource = Math.random,
    skill: BotSkill = "hard"
  ) {
    this.profile = BOT_PROFILES[skill];
  }

  async requestAction(view: PublicGameView): Promise<GameAction> {
    this.memory.observe(view);
    const actions = [...view.legalActions];
    if (actions.length === 0) throw new Error("Bot has no legal action");
    if (actions.length === 1) {
      const chosen = actions[0]!;
      this.memory.rememberChosenAction(view, chosen);
      return chosen;
    }

    // Difficulty changes decision quality only. It never changes the deal,
    // legal actions, or the information visible to the bot.
    if (this.random() < this.profile.mistakeRate) {
      const index = Math.min(
        actions.length - 1,
        Math.floor(this.random() * actions.length)
      );
      const chosen = actions[index]!;
      this.memory.rememberChosenAction(view, chosen);
      return chosen;
    }

    if (view.phase === "defend") {
      const defense = chooseDefense(
        view,
        actions,
        this.profile,
        this.memory.knownOpponentCards()
      );
      if (defense) {
        this.memory.rememberChosenAction(view, defense);
        return defense;
      }
    }

    if (view.phase === "attack") {
      const attacks = actions
        .filter(
          (
            action
          ): action is Extract<
            GameAction,
            { type: "play-attack" | "play-attack-set" }
          > =>
            action.type === "play-attack" || action.type === "play-attack-set"
        )
        .sort((a, b) => {
          const aCard =
            a.type === "play-attack"
              ? cardForAction(view, a)
              : view.ownHand.find((card) => card.id === a.cardIds[0]);
          const bCard =
            b.type === "play-attack"
              ? cardForAction(view, b)
              : view.ownHand.find((card) => card.id === b.cardIds[0]);
          const aTopTrumpBonus =
            aCard &&
            this.memory.isKnownTopTrump(view, aCard) &&
            view.opponentCardCounts[
              view.viewerId === "human" ? "bot" : "human"
            ] <= 1
              ? -12
              : 0;
          const bTopTrumpBonus =
            bCard &&
            this.memory.isKnownTopTrump(view, bCard) &&
            view.opponentCardCounts[
              view.viewerId === "human" ? "bot" : "human"
            ] <= 1
              ? -12
              : 0;

          const costDelta =
            openingActionCost(
              view,
              a,
              this.profile,
              this.memory.knownOpponentCards(),
              this.memory.suitWeakness()
            ) +
            aTopTrumpBonus -
            (
              openingActionCost(
                view,
                b,
                this.profile,
                this.memory.knownOpponentCards(),
                this.memory.suitWeakness()
              ) +
              bTopTrumpBonus
            );
          if (costDelta !== 0) return costDelta;
          if (a.type === "play-attack" && b.type === "play-attack") {
            return comparePlayableCards(view, a, b);
          }
          return a.type === "play-attack-set" ? -1 : 1;
        });
      if (attacks.length > 0) {
        const chosen = attacks[0]!;
        this.memory.rememberChosenAction(view, chosen);
        return chosen;
      }
    }

    if (view.phase === "throw-in" || view.phase === "taking") {
      const throwIn = chooseThrowIn(view, actions, this.profile);
      if (throwIn) {
        this.memory.rememberChosenAction(view, throwIn);
        return throwIn;
      }
    }

    const index = Math.min(
      actions.length - 1,
      Math.floor(this.random() * actions.length)
    );
    const chosen = actions[index]!;
    this.memory.rememberChosenAction(view, chosen);
    return chosen;
  }
}
