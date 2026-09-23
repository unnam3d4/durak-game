import type { Card } from "../core/cards";
import type { MultiplayerPublicView } from "../core/multiplayer-public-view";
import type { ParticipantId } from "../core/participants";
import type { RandomSource } from "../deck/random";
import type { BotSkill } from "./bot-controller";
import { MultiplayerBotMemory } from "./multiplayer-bot-memory";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";
import { canBeat } from "../rules/legal-actions";

type Profile = Readonly<{
  mistakeRate: number;
  trumpConservation: number;
  pressure: number;
  memoryUse: number;
}>;

const PROFILES: Readonly<Record<BotSkill, Profile>> = {
  easy: {
    mistakeRate: 0.18,
    trumpConservation: 0.7,
    pressure: 0.75,
    memoryUse: 0
  },
  normal: {
    mistakeRate: 0.06,
    trumpConservation: 1,
    pressure: 1,
    memoryUse: 0.65
  },
  hard: {
    mistakeRate: 0,
    trumpConservation: 1.2,
    pressure: 1.2,
    memoryUse: 1
  }
};

function cardsForAction(
  view: MultiplayerPublicView,
  action: MultiplayerGameAction
): readonly Card[] {
  if (action.type === "play-attack" || action.type === "play-defense") {
    const card = view.ownHand.find(
      (candidate) => candidate.id === action.cardId
    );
    return card ? [card] : [];
  }
  if (action.type === "play-attack-set") {
    return action.cardIds
      .map((id) => view.ownHand.find((card) => card.id === id))
      .filter((card): card is Card => card !== undefined);
  }
  return [];
}

function cardCost(
  view: MultiplayerPublicView,
  card: Card,
  profile: Profile
): number {
  const rankCost = (card.rank - 6) / 8;
  const trumpPenalty =
    card.suit === view.trumpCard.suit
      ? (view.talonCount > 0 ? 4.5 : 2.25) * profile.trumpConservation
      : 0;
  return rankCost + trumpPenalty;
}

function attackCost(
  view: MultiplayerPublicView,
  action: MultiplayerGameAction,
  profile: Profile,
  memory: MultiplayerBotMemory
): number {
  const cards = cardsForAction(view, action);
  if (cards.length === 0) return Number.POSITIVE_INFINITY;

  const base = cards.reduce(
    (sum, card) => sum + cardCost(view, card, profile),
    0
  );
  const defenderCount = view.cardCounts[view.defenderId];
  const groupBonus =
    Math.max(0, cards.length - 1) *
    (view.talonCount === 0 ? 1.6 : 0.35) *
    profile.pressure;
  const pressureBonus =
    defenderCount <= 2 ? 0.9 * cards.length * profile.pressure : 0;
  const finishingBonus =
    view.talonCount === 0 && cards.length === view.ownHand.length
      ? 100
      : 0;
  const weakness = memory.suitWeaknessFor(view.defenderId);
  const weaknessBonus =
    cards.reduce(
      (sum, card) => sum + (weakness.get(card.suit) ?? 0),
      0
    ) *
    1.4 *
    profile.memoryUse;
  const topTrumpBonus =
    view.talonCount === 0
      ? cards.filter((card) => memory.isKnownTopTrump(view, card)).length *
        0.8 *
        profile.memoryUse *
        profile.pressure
      : 0;
  const knownDefenderCards = memory.knownCardsFor(view.defenderId);
  const knownCoverPenalty =
    cards.reduce(
      (sum, attack) =>
        sum +
        knownDefenderCards.filter((defense) =>
          canBeat(attack, defense, view.trumpCard.suit)
        ).length,
      0
    ) *
    1.25 *
    profile.memoryUse;

  return (
    base +
    knownCoverPenalty -
    groupBonus -
    pressureBonus -
    finishingBonus -
    weaknessBonus -
    topTrumpBonus
  );
}

function defenseCost(
  view: MultiplayerPublicView,
  action: Extract<MultiplayerGameAction, { type: "play-defense" }>,
  profile: Profile
): number {
  const card = cardsForAction(view, action)[0];
  if (!card) return Number.POSITIVE_INFINITY;

  let cost = cardCost(view, card, profile) * 2;
  if (view.talonCount === 0) cost -= 1.6 * profile.pressure;
  if (view.ownHand.length <= 3) cost -= 0.8 * profile.pressure;
  return cost;
}

function chooseDefense(
  view: MultiplayerPublicView,
  profile: Profile
): MultiplayerGameAction | undefined {
  const defenses = view.legalActions
    .filter(
      (
        action
      ): action is Extract<
        MultiplayerGameAction,
        { type: "play-defense" }
      > => action.type === "play-defense"
    )
    .sort(
      (a, b) =>
        defenseCost(view, a, profile) -
        defenseCost(view, b, profile)
    );
  const take = view.legalActions.find((action) => action.type === "take");

  if (defenses.length === 0) return take;

  const cheapest = defenses[0]!;
  const cheapestCards = cardsForAction(view, cheapest);
  const expensiveTrump =
    cheapestCards[0]?.suit === view.trumpCard.suit &&
    view.talonCount > 0 &&
    view.ownHand.length >= 4;

  if (take && expensiveTrump && defenseCost(view, cheapest, profile) > 5.5) {
    return take;
  }
  return cheapest;
}

function chooseAttack(
  view: MultiplayerPublicView,
  profile: Profile,
  memory: MultiplayerBotMemory
): MultiplayerGameAction | undefined {
  const attacks = view.legalActions
    .filter(
      (action) =>
        action.type === "play-attack" ||
        action.type === "play-attack-set"
    )
    .sort(
      (a, b) =>
        attackCost(view, a, profile, memory) -
        attackCost(view, b, profile, memory)
    );
  return attacks[0];
}

function chooseThrowIn(
  view: MultiplayerPublicView,
  profile: Profile,
  memory: MultiplayerBotMemory
): MultiplayerGameAction | undefined {
  const pass = view.legalActions.find(
    (action) => action.type === "pass-throw-in"
  );
  const attacks = view.legalActions.filter(
    (action) =>
      action.type === "play-attack" ||
      action.type === "play-attack-set"
  );
  if (attacks.length === 0) return pass;

  const nonTrump = attacks.filter((action) =>
    cardsForAction(view, action).every(
      (card) => card.suit !== view.trumpCard.suit
    )
  );

  if (view.phase === "taking") {
    const candidates = nonTrump.length > 0 ? nonTrump : attacks;
    if (
      nonTrump.length === 0 &&
      view.talonCount > 0 &&
      view.ownHand.length > 2
    ) {
      return pass;
    }
    return candidates.sort((a, b) => {
      const aCards = cardsForAction(view, a);
      const bCards = cardsForAction(view, b);
      if (aCards.length !== bCards.length) {
        return bCards.length - aCards.length;
      }
      const aRanks = aCards.reduce((sum, card) => sum + card.rank, 0);
      const bRanks = bCards.reduce((sum, card) => sum + card.rank, 0);
      return bRanks - aRanks;
    })[0];
  }

  const defenderNearOut = view.cardCounts[view.defenderId] <= 1;
  if (nonTrump.length > 0) {
    return nonTrump.sort(
      (a, b) =>
        attackCost(view, a, profile, memory) -
        attackCost(view, b, profile, memory)
    )[0];
  }
  if (view.talonCount === 0 || defenderNearOut) {
    return attacks.sort(
      (a, b) =>
        attackCost(view, a, profile, memory) -
        attackCost(view, b, profile, memory)
    )[0];
  }
  return pass;
}

export class MultiplayerBotController {
  private readonly profile: Profile;
  private readonly memory = new MultiplayerBotMemory();

  constructor(
    private readonly random: RandomSource = Math.random,
    skill: BotSkill = "hard"
  ) {
    this.profile = PROFILES[skill];
  }

  observe(view: MultiplayerPublicView): void {
    this.memory.observe(view);
  }

  async requestAction(
    view: MultiplayerPublicView
  ): Promise<MultiplayerGameAction> {
    this.observe(view);

    const actions = [...view.legalActions];
    if (actions.length === 0) {
      throw new Error("Multiplayer bot has no legal action");
    }

    const remember = (action: MultiplayerGameAction) => {
      this.memory.rememberChosenAction(view, action);
      return action;
    };

    if (actions.length === 1) return remember(actions[0]!);

    if (this.random() < this.profile.mistakeRate) {
      const index = Math.min(
        actions.length - 1,
        Math.floor(this.random() * actions.length)
      );
      return remember(actions[index]!);
    }

    let chosen: MultiplayerGameAction | undefined;
    if (view.phase === "defend") {
      chosen = chooseDefense(view, this.profile);
    } else if (view.phase === "attack") {
      chosen = chooseAttack(view, this.profile, this.memory);
    } else if (view.phase === "throw-in" || view.phase === "taking") {
      chosen = chooseThrowIn(view, this.profile, this.memory);
    }

    if (chosen) return remember(chosen);

    const index = Math.min(
      actions.length - 1,
      Math.floor(this.random() * actions.length)
    );
    return remember(actions[index]!);
  }
}

export function opponentIds(
  view: MultiplayerPublicView
): readonly ParticipantId[] {
  return view.participants.filter(
    (participantId) => participantId !== view.viewerId
  );
}
