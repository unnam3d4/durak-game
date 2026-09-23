import type { Card } from "../core/cards";
import type {
  MultiplayerGameState,
  ParticipantHands
} from "../core/multiplayer-game-types";
import {
  nextEligibleParticipant,
  participantOrder,
  type ParticipantCount,
  type ParticipantId
} from "../core/participants";
import { createDeck36, shuffleDeck } from "../deck/deck";
import { createSeededRandom } from "../deck/random";

function emptyHands(): Record<ParticipantId, Card[]> {
  return {
    human: [],
    bot: [],
    bot2: [],
    bot3: []
  };
}

function dealRoundRobin(
  deck: readonly Card[],
  participants: readonly ParticipantId[]
): {
  hands: ParticipantHands;
  talon: readonly Card[];
} {
  const hands = emptyHands();
  let cursor = 0;

  for (let round = 0; round < 6; round += 1) {
    for (const participantId of participants) {
      hands[participantId].push(deck[cursor++]!);
    }
  }

  return {
    hands,
    talon: deck.slice(cursor)
  };
}

function lowestTrumpHolder(
  participants: readonly ParticipantId[],
  hands: ParticipantHands,
  trumpSuit: Card["suit"],
  fallback: ParticipantId
): ParticipantId {
  const candidates = participants
    .flatMap((participantId) =>
      hands[participantId].map((card) => ({ participantId, card }))
    )
    .filter(({ card }) => card.suit === trumpSuit)
    .sort((a, b) => a.card.rank - b.card.rank);

  return candidates[0]?.participantId ?? fallback;
}

export function fallbackAttackerForSeed(
  seed: number,
  participants: readonly ParticipantId[]
): ParticipantId {
  if (participants.length === 0) {
    throw new Error("At least one participant is required");
  }
  return participants[(seed >>> 0) % participants.length]!;
}

export function createMultiplayerMatch(
  seed: number,
  participantCount: ParticipantCount
): MultiplayerGameState {
  const participants = participantOrder(participantCount);
  const shuffled = shuffleDeck(createDeck36(), createSeededRandom(seed));
  const { hands, talon } = dealRoundRobin(shuffled, participants);
  const trumpCard = talon[talon.length - 1]!;
  const fallbackAttacker = fallbackAttackerForSeed(seed, participants);
  const attackerId = lowestTrumpHolder(
    participants,
    hands,
    trumpCard.suit,
    fallbackAttacker
  );
  const defenderId = nextEligibleParticipant(
    participants,
    attackerId,
    new Set(participants)
  );
  if (!defenderId) {
    throw new Error("A multiplayer match requires at least two participants");
  }

  return {
    schemaVersion: 2,
    seed,
    participants,
    hands,
    talon,
    trumpCard,
    discard: [],
    table: [],
    attackerId,
    defenderId,
    activePlayerId: attackerId,
    phase: "attack",
    defenderHandSizeAtBoutStart: hands[defenderId].length,
    finishOrder: [],
    boutFinishOrder: [],
    foolId: null,
    throwInCursor: 0,
    consecutivePasses: 0,
    turnNumber: 1
  };
}
