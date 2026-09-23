import type { Card } from "../core/cards";
import type { MultiplayerPublicView } from "../core/multiplayer-public-view";
import type { ParticipantId } from "../core/participants";
import type { RandomSource } from "../deck/random";
import type { BotSkill } from "./bot-controller";
import {
  createBaselineBotPersonality,
  createBotPersonality,
  type BotPersonality
} from "./multiplayer-bot-personality";
import { MultiplayerBotMemory } from "./multiplayer-bot-memory";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";
import { canBeat } from "../rules/legal-actions";

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
  if (action.type === "play-attack-set" || action.type === "transfer") {
    return action.cardIds
      .map((id) => view.ownHand.find((card) => card.id === id))
      .filter((card): card is Card => card !== undefined);
  }
  return [];
}

function cardCost(
  view: MultiplayerPublicView,
  card: Card,
  profile: BotPersonality
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
  profile: BotPersonality,
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
    2.5 *
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
  profile: BotPersonality
): number {
  const card = cardsForAction(view, action)[0];
  if (!card) return Number.POSITIVE_INFINITY;

  let cost = cardCost(view, card, profile) * 2;
  if (view.talonCount === 0) cost -= 1.6 * profile.pressure;
  if (view.ownHand.length <= 3) cost -= 0.8 * profile.pressure;
  return cost;
}

function transferCost(
  view: MultiplayerPublicView,
  action: Extract<MultiplayerGameAction, { type: "transfer" }>,
  profile: BotPersonality
): number {
  const cards = cardsForAction(view, action);
  if (cards.length === 0) return Number.POSITIVE_INFINITY;

  const base = cards.reduce(
    (sum, card) => sum + cardCost(view, card, profile),
    0
  );
  const finishingBonus =
    view.talonCount === 0 && cards.length === view.ownHand.length
      ? 100
      : 0;
  const tempoBonus =
    Math.max(0, cards.length - 1) *
    (view.talonCount === 0 ? 1.8 : 0.45) *
    profile.pressure;

  return base - finishingBonus - tempoBonus;
}

function chooseDefense(
  view: MultiplayerPublicView,
  profile: BotPersonality,
  breakCycle: boolean
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
  const transfers = view.legalActions
    .filter(
      (
        action
      ): action is Extract<
        MultiplayerGameAction,
        { type: "transfer" }
      > => action.type === "transfer"
    )
    .sort(
      (a, b) =>
        transferCost(view, a, profile) -
        transferCost(view, b, profile)
    );
  const take = view.legalActions.find((action) => action.type === "take");

  const bestTransfer = transfers[0];
  if (bestTransfer) {
    const transferCards = cardsForAction(view, bestTransfer);
    const finishesHand =
      transferCards.length === view.ownHand.length;
    const cheapestDefense = defenses[0];
    const defenseIsMoreExpensive =
      cheapestDefense === undefined ||
      transferCost(view, bestTransfer, profile) + 0.7 <
        defenseCost(view, cheapestDefense, profile);

    if (finishesHand || defenseIsMoreExpensive) {
      return bestTransfer;
    }
  }

  if (defenses.length === 0) {
    return bestTransfer ?? take;
  }

  if (breakCycle) {
    if (bestTransfer) return bestTransfer;
    if (defenses.length > 1) return defenses[1]!;
    if (take) return take;
  }

  const cheapest = defenses[0]!;
  const cheapestCards = cardsForAction(view, cheapest);
  const expensiveTrump =
    cheapestCards[0]?.suit === view.trumpCard.suit &&
    view.talonCount > 0 &&
    view.ownHand.length >= 4;

  if (take && expensiveTrump && defenseCost(view, cheapest, profile) > 5.5) {
    return bestTransfer ?? take;
  }
  return cheapest;
}

function chooseAttack(
  view: MultiplayerPublicView,
  profile: BotPersonality,
  memory: MultiplayerBotMemory,
  breakCycle: boolean
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

  const best = attacks[0];
  if (!best) return undefined;

  const bestCards = cardsForAction(view, best);
  const finishesHand = bestCards.length === view.ownHand.length;
  if (breakCycle && !finishesHand && attacks.length > 1) {
    return attacks[1];
  }

  return best;
}

function chooseThrowIn(
  view: MultiplayerPublicView,
  profile: BotPersonality,
  memory: MultiplayerBotMemory,
  breakCycle: boolean
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
  if (breakCycle && pass) return pass;

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
  private readonly memory = new MultiplayerBotMemory();
  readonly personality: BotPersonality;

  constructor(
    private readonly random: RandomSource = Math.random,
    personality: BotPersonality | BotSkill = "hard"
  ) {
    this.personality =
      typeof personality === "string"
        ? createBaselineBotPersonality(personality)
        : personality;
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

    if (this.random() < this.personality.mistakeTendency) {
      const index = Math.min(
        actions.length - 1,
        Math.floor(this.random() * actions.length)
      );
      return remember(actions[index]!);
    }

    const breakCycle =
      this.personality.memoryUse >= 1 &&
      this.memory.positionVisitCount(view) >= 3;

    let chosen: MultiplayerGameAction | undefined;
    if (view.phase === "defend") {
      chosen = chooseDefense(view, this.personality, breakCycle);
    } else if (view.phase === "attack") {
      chosen = chooseAttack(
        view,
        this.personality,
        this.memory,
        breakCycle
      );
    } else if (view.phase === "throw-in" || view.phase === "taking") {
      chosen = chooseThrowIn(
        view,
        this.personality,
        this.memory,
        breakCycle
      );
    }

    if (chosen) return remember(chosen);

    const index = Math.min(
      actions.length - 1,
      Math.floor(this.random() * actions.length)
    );
    return remember(actions[index]!);
  }
}

export function createBotController(
  random: RandomSource,
  seed: number,
  participantId: ParticipantId,
  skill: BotSkill
): MultiplayerBotController {
  return new MultiplayerBotController(
    random,
    createBotPersonality(seed, participantId, skill)
  );
}

export function opponentIds(
  view: MultiplayerPublicView
): readonly ParticipantId[] {
  return view.participants.filter(
    (participantId) => participantId !== view.viewerId
  );
}
