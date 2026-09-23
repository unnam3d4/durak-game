import { RANKS, type Card } from "../core/cards";
import type { PublicGameView } from "../core/public-view";
import type { GameAction } from "../rules/legal-actions";

function currentUnbeatenAttack(view: PublicGameView): Card | undefined {
  return view.table.find((pair) => pair.defense === undefined)?.attack;
}

export class BotMemory {
  private readonly knownOpponentCardsById = new Map<string, Card>();
  private readonly opponentSuitWeaknessBySuit = new Map<Card["suit"], number>();
  private readonly observedTakeTurns = new Set<number>();
  private readonly observedOpponentDefenseIds = new Set<string>();
  private readonly seenPublicCards = new Map<string, Card>();

  observe(view: PublicGameView): void {
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

    for (const card of tableCards) {
      this.knownOpponentCardsById.delete(card.id);
    }

    if (view.defenderId !== view.viewerId) {
      for (const pair of view.table) {
        const defense = pair.defense;
        if (!defense || this.observedOpponentDefenseIds.has(defense.id)) continue;
        this.observedOpponentDefenseIds.add(defense.id);

        if (pair.attack.suit === view.trumpCard.suit) continue;
        const previous =
          this.opponentSuitWeaknessBySuit.get(pair.attack.suit) ?? 0;
        if (defense.suit === view.trumpCard.suit) {
          this.opponentSuitWeaknessBySuit.set(
            pair.attack.suit,
            Math.min(3, previous + 0.75)
          );
        } else if (defense.suit === pair.attack.suit) {
          this.opponentSuitWeaknessBySuit.set(
            pair.attack.suit,
            Math.max(0, previous - 0.8)
          );
        }
      }
    }

    if (view.phase === "taking" && view.defenderId !== view.viewerId) {
      for (const card of tableCards) {
        this.knownOpponentCardsById.set(card.id, card);
      }

      if (!this.observedTakeTurns.has(view.turnNumber)) {
        this.observedTakeTurns.add(view.turnNumber);
        const unbeatenAttack = currentUnbeatenAttack(view);
        if (
          unbeatenAttack &&
          unbeatenAttack.suit !== view.trumpCard.suit
        ) {
          const previous =
            this.opponentSuitWeaknessBySuit.get(unbeatenAttack.suit) ?? 0;
          this.opponentSuitWeaknessBySuit.set(
            unbeatenAttack.suit,
            Math.min(3, previous + 1)
          );
        }
      }
    }
  }

  rememberChosenAction(view: PublicGameView, action: GameAction): void {
    if (action.type === "play-attack" || action.type === "play-defense") {
      const card = view.ownHand.find(
        (candidate) => candidate.id === action.cardId
      );
      if (card) this.seenPublicCards.set(card.id, card);
      return;
    }

    if (action.type === "play-attack-set") {
      for (const id of action.cardIds) {
        const card = view.ownHand.find((candidate) => candidate.id === id);
        if (card) this.seenPublicCards.set(card.id, card);
      }
    }
  }

  knownOpponentCards(): readonly Card[] {
    return [...this.knownOpponentCardsById.values()];
  }

  suitWeakness(): ReadonlyMap<Card["suit"], number> {
    return this.opponentSuitWeaknessBySuit;
  }

  isKnownTopTrump(view: PublicGameView, card: Card): boolean {
    if (view.talonCount > 0 || card.suit !== view.trumpCard.suit) return false;

    const knownHigherOpponentTrump = [
      ...this.knownOpponentCardsById.values()
    ].some(
      (known) =>
        known.suit === view.trumpCard.suit &&
        known.rank > card.rank
    );
    if (knownHigherOpponentTrump) return false;

    const unavailableToOpponent = new Set<string>([
      ...view.ownHand.map((known) => known.id),
      ...[...this.seenPublicCards.keys()].filter(
        (id) => !this.knownOpponentCardsById.has(id)
      )
    ]);

    return RANKS
      .filter((rank) => rank > card.rank)
      .every((rank) =>
        unavailableToOpponent.has(`${view.trumpCard.suit}-${rank}`)
      );
  }
}
