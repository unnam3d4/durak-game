import { RANKS, type Card } from "../core/cards";
import type { MultiplayerPublicView } from "../core/multiplayer-public-view";
import type { ParticipantId } from "../core/participants";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";

const PARTICIPANTS: readonly ParticipantId[] = [
  "human",
  "bot",
  "bot2",
  "bot3"
];

function createCardMaps(): Record<ParticipantId, Map<string, Card>> {
  return {
    human: new Map(),
    bot: new Map(),
    bot2: new Map(),
    bot3: new Map()
  };
}

function publicPositionKey(view: MultiplayerPublicView): string {
  const hand = view.ownHand.map((card) => card.id).sort().join(",");
  const counts = view.participants
    .map((participantId) => `${participantId}:${view.cardCounts[participantId]}`)
    .join(",");
  const table = view.table
    .map(
      (pair) =>
        `${pair.attack.id}/${pair.defense?.id ?? "-"}`
    )
    .join(",");
  const discard = view.discard.map((card) => card.id).sort().join(",");

  return [
    view.viewerId,
    hand,
    counts,
    view.talonCount,
    view.trumpCard.id,
    discard,
    table,
    view.attackerId,
    view.defenderId,
    view.activePlayerId,
    view.phase,
    view.defenderHandSizeAtBoutStart,
    view.finishOrder.join(","),
    view.lastTakeEvent?.id ?? "-",
    view.foolId ?? "-"
  ].join("|");
}

function createWeaknessMaps(): Record<
  ParticipantId,
  Map<Card["suit"], number>
> {
  return {
    human: new Map(),
    bot: new Map(),
    bot2: new Map(),
    bot3: new Map()
  };
}

export class MultiplayerBotMemory {
  private readonly knownCardsByParticipant = createCardMaps();
  private readonly suitWeaknessByParticipant = createWeaknessMaps();
  private readonly observedTakeEventIds = new Set<number>();
  private readonly observedDefenseIds = new Set<string>();
  private readonly seenPublicCards = new Map<string, Card>();
  private readonly positionVisits = new Map<string, number>();
  private readonly observedPositionTurns = new Set<string>();

  observe(view: MultiplayerPublicView): void {
    const positionKey = publicPositionKey(view);
    const positionTurnKey = `${positionKey}#${view.turnNumber}`;
    if (!this.observedPositionTurns.has(positionTurnKey)) {
      this.observedPositionTurns.add(positionTurnKey);
      this.positionVisits.set(
        positionKey,
        (this.positionVisits.get(positionKey) ?? 0) + 1
      );
    }

    const tableCards = view.table.flatMap((pair) => [
      pair.attack,
      ...(pair.defense ? [pair.defense] : [])
    ]);

    for (const card of tableCards) {
      this.seenPublicCards.set(card.id, card);
    }
    for (const card of view.discard) {
      this.seenPublicCards.set(card.id, card);
    }

    for (const participantId of PARTICIPANTS) {
      for (const card of tableCards) {
        this.knownCardsByParticipant[participantId].delete(card.id);
      }
    }

    if (view.defenderId !== view.viewerId) {
      for (const pair of view.table) {
        const defense = pair.defense;
        if (!defense) continue;

        const observationId = `${view.defenderId}:${defense.id}`;
        if (this.observedDefenseIds.has(observationId)) continue;
        this.observedDefenseIds.add(observationId);

        if (pair.attack.suit === view.trumpCard.suit) continue;
        const weaknesses =
          this.suitWeaknessByParticipant[view.defenderId];
        const previous = weaknesses.get(pair.attack.suit) ?? 0;

        if (defense.suit === view.trumpCard.suit) {
          weaknesses.set(
            pair.attack.suit,
            Math.min(3, previous + 0.75)
          );
        } else if (defense.suit === pair.attack.suit) {
          weaknesses.set(
            pair.attack.suit,
            Math.max(0, previous - 0.8)
          );
        }
      }
    }

    if (view.phase === "taking" && view.defenderId !== view.viewerId) {
      const known = this.knownCardsByParticipant[view.defenderId];
      for (const card of tableCards) {
        known.set(card.id, card);
      }
    }

    const takeEvent = view.lastTakeEvent;
    if (
      takeEvent &&
      takeEvent.defenderId !== view.viewerId &&
      !this.observedTakeEventIds.has(takeEvent.id)
    ) {
      this.observedTakeEventIds.add(takeEvent.id);
      const known = this.knownCardsByParticipant[takeEvent.defenderId];
      for (const card of takeEvent.cards) {
        known.set(card.id, card);
        this.seenPublicCards.set(card.id, card);
      }

      if (takeEvent.triggerAttack.suit !== view.trumpCard.suit) {
        const weaknesses =
          this.suitWeaknessByParticipant[takeEvent.defenderId];
        const previous =
          weaknesses.get(takeEvent.triggerAttack.suit) ?? 0;
        weaknesses.set(
          takeEvent.triggerAttack.suit,
          Math.min(3, previous + 1)
        );
      }
    }
  }

  rememberChosenAction(
    view: MultiplayerPublicView,
    action: MultiplayerGameAction
  ): void {
    if (action.type === "play-attack" || action.type === "play-defense") {
      const card = view.ownHand.find(
        (candidate) => candidate.id === action.cardId
      );
      if (card) this.seenPublicCards.set(card.id, card);
      return;
    }

    if (action.type === "play-attack-set") {
      for (const id of action.cardIds) {
        const card = view.ownHand.find(
          (candidate) => candidate.id === id
        );
        if (card) this.seenPublicCards.set(card.id, card);
      }
    }
  }

  positionVisitCount(view: MultiplayerPublicView): number {
    return this.positionVisits.get(publicPositionKey(view)) ?? 0;
  }

  knownCardsFor(
    participantId: ParticipantId
  ): readonly Card[] {
    return [...this.knownCardsByParticipant[participantId].values()];
  }

  suitWeaknessFor(
    participantId: ParticipantId
  ): ReadonlyMap<Card["suit"], number> {
    return this.suitWeaknessByParticipant[participantId];
  }

  isKnownTopTrump(
    view: MultiplayerPublicView,
    card: Card
  ): boolean {
    if (
      view.talonCount > 0 ||
      card.suit !== view.trumpCard.suit
    ) {
      return false;
    }

    const knownHigherOpponentTrump = PARTICIPANTS
      .filter((participantId) => participantId !== view.viewerId)
      .some((participantId) =>
        [...this.knownCardsByParticipant[participantId].values()].some(
          (known) =>
            known.suit === view.trumpCard.suit &&
            known.rank > card.rank
        )
      );

    if (knownHigherOpponentTrump) return false;

    const knownInOpponentHands = new Set<string>(
      PARTICIPANTS
        .filter((participantId) => participantId !== view.viewerId)
        .flatMap((participantId) =>
          [...this.knownCardsByParticipant[participantId].keys()]
        )
    );

    const unavailableToOpponents = new Set<string>([
      ...view.ownHand.map((known) => known.id),
      ...[...this.seenPublicCards.keys()].filter(
        (id) => !knownInOpponentHands.has(id)
      )
    ]);

    return RANKS
      .filter((rank) => rank > card.rank)
      .every((rank) =>
        unavailableToOpponents.has(`${view.trumpCard.suit}-${rank}`)
      );
  }
}
