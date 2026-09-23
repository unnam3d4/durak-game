import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import {
  attackersForBout,
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
  const finished = new Set(state.finishOrder);
  return new Set(
    state.participants.filter((participantId) => !finished.has(participantId))
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

export function getMultiplayerLegalActions(
  state: MultiplayerGameState,
  playerId: ParticipantId
): readonly MultiplayerGameAction[] {
  if (
    state.phase === "finished" ||
    state.activePlayerId !== playerId ||
    state.finishOrder.includes(playerId)
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

    return [...defenses, { type: "take", playerId }];
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
