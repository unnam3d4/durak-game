import type { Card } from "../core/cards";
import type { GameState, PlayerId } from "../core/game-types";
import { createDeck36, shuffleDeck } from "../deck/deck";
import { createSeededRandom } from "../deck/random";

function dealAlternating(deck: readonly Card[]) {
  const human: Card[] = [];
  const bot: Card[] = [];
  let cursor = 0;

  for (let round = 0; round < 6; round += 1) {
    human.push(deck[cursor++]!);
    bot.push(deck[cursor++]!);
  }

  return { human, bot, talon: deck.slice(cursor) };
}

function lowestTrumpHolder(
  hands: Readonly<Record<PlayerId, readonly Card[]>>,
  trumpSuit: Card["suit"]
): PlayerId {
  const candidates = (["human", "bot"] as const)
    .flatMap((id) => hands[id].map((card) => ({ id, card })))
    .filter(({ card }) => card.suit === trumpSuit)
    .sort((a, b) => a.card.rank - b.card.rank);

  return candidates[0]?.id ?? "human";
}

export function createMatch1v1(seed: number): GameState {
  const shuffled = shuffleDeck(createDeck36(), createSeededRandom(seed));
  const { human, bot, talon } = dealAlternating(shuffled);
  const trumpCard = talon[talon.length - 1]!;
  const hands = { human, bot } as const;
  const attackerId = lowestTrumpHolder(hands, trumpCard.suit);
  const defenderId: PlayerId = attackerId === "human" ? "bot" : "human";

  return {
    schemaVersion: 1,
    seed,
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
    result: null,
    turnNumber: 1
  };
}
