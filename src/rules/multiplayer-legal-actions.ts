import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import {
  attackersForBout,
  nextEligibleParticipant,
  type ParticipantId
} from "../core/participants";
import { canBeat } from "./legal-actions";

export type MultiplayerGameAction =
  | { type: "play-attack"; playerId: ParticipantId; cardId: string }
  | {
      type: "play-attack-set";
      playerId: ParticipantId;
      cardIds: readonly string[];
    }
  | {
      type: "play-defense";
      playerId: ParticipantId;
      attackCardId: string;
      cardId: string;
    }
  | {
      type: "transfer";
      playerId: ParticipantId;
      cardIds: readonly string[];
    }
  | { type: "take"; playerId: ParticipantId }
  | { type: "pass-throw-in"; playerId: ParticipantId };

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];

  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index += 1) {
    const head = items[index]!;
    for (const tail of combinations(items.slice(index + 1), size - 1)) {
      result.push([head, ...tail]);
    }
  }
  return result;
}

function activeParticipants(
  state: MultiplayerGameState
): ReadonlySet<ParticipantId> {
  const unavailable = new Set([
    ...state.finishOrder,
    ...state.forfeitOrder
  ]);
  return new Set(
    state.participants.filter(
      (participantId) => !unavailable.has(participantId)
    )
  );
}

function attackSets(
  cards: readonly Card[],
  playerId: ParticipantId,
  maxSize: number
): MultiplayerGameAction[] {
  const actions: MultiplayerGameAction[] = [];
  for (let size = 2; size <= Math.min(cards.length, maxSize); size += 1) {
    for (const group of combinations(cards, size)) {
      actions.push({
        type: "play-attack-set",
        playerId,
        cardIds: group.map((card) => card.id)
      });
    }
  }
  return actions;
}

function transferActions(
  state: MultiplayerGameState,
  playerId: ParticipantId,
  hand: readonly Card[]
): MultiplayerGameAction[] {
  if (
    state.variant !== "perevodnoy" ||
    state.table.length === 0 ||
    state.table.some((pair) => pair.defense !== undefined)
  ) {
    return [];
  }

  const transferRank = state.table[0]!.attack.rank;
  if (state.table.some((pair) => pair.attack.rank !== transferRank)) {
    return [];
  }

  const eligible = activeParticipants(state);
  const nextDefender = nextEligibleParticipant(
    state.participants,
    state.defenderId,
    eligible
  );
  if (!nextDefender || nextDefender === state.defenderId) {
    return [];
  }

  const attackCap = Math.min(
    6,
    state.hands[nextDefender].length
  );
  const remainingSlots = attackCap - state.table.length;
  if (remainingSlots <= 0) return [];

  const matching = hand.filter((card) => card.rank === transferRank);
  const actions: MultiplayerGameAction[] = [];
  for (
    let size = 1;
    size <= Math.min(matching.length, remainingSlots);
    size += 1
  ) {
    for (const group of combinations(matching, size)) {
      actions.push({
        type: "transfer",
        playerId,
        cardIds: group.map((card) => card.id)
      });
    }
  }

  return actions;
}

export function getMultiplayerLegalActions(
  state: MultiplayerGameState,
  playerId: ParticipantId
): readonly MultiplayerGameAction[] {
  if (
    state.phase === "finished" ||
    state.activePlayerId !== playerId ||
    state.finishOrder.includes(playerId) ||
    state.forfeitOrder.includes(playerId)
  ) {
    return [];
  }

  const hand = state.hands[playerId];

  if (state.phase === "attack" && state.table.length === 0) {
    if (playerId !== state.attackerId) return [];

    const singles: MultiplayerGameAction[] = hand.map((card) => ({
      type: "play-attack",
      playerId,
      cardId: card.id
    }));
    const cap = Math.min(6, state.defenderHandSizeAtBoutStart);
    const byRank = new Map<number, Card[]>();
    for (const card of hand) {
      const sameRank = byRank.get(card.rank) ?? [];
      sameRank.push(card);
      byRank.set(card.rank, sameRank);
    }

    const sets: MultiplayerGameAction[] = [];
    for (const cards of byRank.values()) {
      sets.push(...attackSets(cards, playerId, cap));
    }

    return [...singles, ...sets];
  }

  if (state.phase === "defend") {
    if (playerId !== state.defenderId) return [];

    const defenses: MultiplayerGameAction[] = [];
    for (const pair of state.table) {
      if (pair.defense) continue;
      for (const card of hand) {
        if (!canBeat(pair.attack, card, state.trumpCard.suit)) continue;
        defenses.push({
          type: "play-defense",
          playerId,
          attackCardId: pair.attack.id,
          cardId: card.id
        });
      }
    }

    const transfers = transferActions(state, playerId, hand);
    return [
      ...defenses,
      ...transfers,
      { type: "take", playerId }
    ];
  }

  if (state.phase === "throw-in" || state.phase === "taking") {
    const eligible = activeParticipants(state);
    const attackers = attackersForBout(
      state.participants,
      state.attackerId,
      state.defenderId,
      eligible
    );
    if (!attackers.includes(playerId)) return [];

    const cap = Math.min(6, state.defenderHandSizeAtBoutStart);
    const remainingSlots = Math.max(0, cap - state.table.length);
    const visibleRanks = new Set(
      state.table.flatMap((pair) => [
        pair.attack.rank,
        ...(pair.defense ? [pair.defense.rank] : [])
      ])
    );
    const matchingCards =
      remainingSlots === 0
        ? []
        : hand.filter((card) => visibleRanks.has(card.rank));

    const singles: MultiplayerGameAction[] = matchingCards.map((card) => ({
      type: "play-attack",
      playerId,
      cardId: card.id
    }));
    const sets = attackSets(
      matchingCards,
      playerId,
      remainingSlots
    );

    return [
      ...singles,
      ...sets,
      { type: "pass-throw-in", playerId }
    ];
  }

  return [];
}
