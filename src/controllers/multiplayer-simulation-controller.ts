import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import type {
  ParticipantCount,
  ParticipantId
} from "../core/participants";
import { createSeededRandom, type RandomSource } from "../deck/random";
import { createMultiplayerMatch } from "../rules/create-multiplayer-match";
import {
  getMultiplayerLegalActions,
  type MultiplayerGameAction
} from "../rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../rules/multiplayer-reducer";

export type MultiplayerSimulationResult = Readonly<{
  terminated: boolean;
  actions: number;
  illegalActionCount: number;
  cardInvariantOk: boolean;
  finalState: MultiplayerGameState;
}>;

function collectPhysicalCards(state: MultiplayerGameState): Card[] {
  return [
    ...state.participants.flatMap((participantId) => state.hands[participantId]),
    ...state.talon,
    ...state.discard,
    ...state.table.flatMap((pair) => [
      pair.attack,
      ...(pair.defense ? [pair.defense] : [])
    ])
  ];
}

export function multiplayerCardInvariantHolds(
  state: MultiplayerGameState
): boolean {
  const cards = collectPhysicalCards(state);
  return cards.length === 36 && new Set(cards.map((card) => card.id)).size === 36;
}

function cardForAction(
  state: MultiplayerGameState,
  action: MultiplayerGameAction
): Card | undefined {
  if (action.type !== "play-attack" && action.type !== "play-defense") {
    return undefined;
  }
  return state.hands[action.playerId].find(
    (card) => card.id === action.cardId
  );
}

function compareCards(
  state: MultiplayerGameState,
  a: MultiplayerGameAction,
  b: MultiplayerGameAction
): number {
  const cardA = cardForAction(state, a);
  const cardB = cardForAction(state, b);
  if (!cardA || !cardB) return 0;

  const aTrump = cardA.suit === state.trumpCard.suit ? 1 : 0;
  const bTrump = cardB.suit === state.trumpCard.suit ? 1 : 0;
  if (aTrump !== bTrump) return aTrump - bTrump;
  return cardA.rank - cardB.rank;
}

function chooseSimulationAction(
  state: MultiplayerGameState,
  playerId: ParticipantId,
  random: RandomSource
): MultiplayerGameAction {
  const actions = [
    ...getMultiplayerLegalActions(state, playerId)
  ];
  if (actions.length === 0) {
    throw new Error(`No legal action for ${playerId}`);
  }

  if (state.phase === "defend") {
    const defenses = actions
      .filter(
        (
          action
        ): action is Extract<
          MultiplayerGameAction,
          { type: "play-defense" }
        > => action.type === "play-defense"
      )
      .sort((a, b) => compareCards(state, a, b));

    if (defenses.length > 0 && random() >= 0.18) {
      return defenses[0]!;
    }
    return actions.find((action) => action.type === "take")!;
  }

  if (state.phase === "attack") {
    const sets = actions.filter(
      (
        action
      ): action is Extract<
        MultiplayerGameAction,
        { type: "play-attack-set" }
      > => action.type === "play-attack-set"
    );
    if (sets.length > 0 && random() < 0.3) {
      return sets.sort((a, b) => b.cardIds.length - a.cardIds.length)[0]!;
    }

    return actions
      .filter((action) => action.type === "play-attack")
      .sort((a, b) => compareCards(state, a, b))[0]!;
  }

  const attacks = actions.filter(
    (action) =>
      action.type === "play-attack" ||
      action.type === "play-attack-set"
  );
  const pass = actions.find((action) => action.type === "pass-throw-in")!;

  if (attacks.length === 0) return pass;

  if (state.phase === "taking") {
    if (random() < 0.8) {
      return attacks.sort((a, b) => {
        const sizeA = a.type === "play-attack-set" ? a.cardIds.length : 1;
        const sizeB = b.type === "play-attack-set" ? b.cardIds.length : 1;
        if (sizeA !== sizeB) return sizeB - sizeA;
        return compareCards(state, b, a);
      })[0]!;
    }
    return pass;
  }

  if (random() < 0.55) {
    return attacks.sort((a, b) => {
      const sizeA = a.type === "play-attack-set" ? a.cardIds.length : 1;
      const sizeB = b.type === "play-attack-set" ? b.cardIds.length : 1;
      if (sizeA !== sizeB) return sizeB - sizeA;
      return compareCards(state, a, b);
    })[0]!;
  }

  return pass;
}

export async function simulateMultiplayerMatch(
  seed: number,
  participantCount: ParticipantCount,
  maxActions = 3000
): Promise<MultiplayerSimulationResult> {
  let state = createMultiplayerMatch(seed, participantCount);
  let actions = 0;
  let illegalActionCount = 0;
  let cardInvariantOk = multiplayerCardInvariantHolds(state);
  const randomByPlayer: Record<ParticipantId, RandomSource> = {
    human: createSeededRandom(seed ^ 0x11111111),
    bot: createSeededRandom(seed ^ 0x22222222),
    bot2: createSeededRandom(seed ^ 0x33333333),
    bot3: createSeededRandom(seed ^ 0x44444444)
  };

  while (state.phase !== "finished" && actions < maxActions) {
    const active = state.activePlayerId;
    try {
      const action = chooseSimulationAction(
        state,
        active,
        randomByPlayer[active]
      );
      state = applyMultiplayerAction(state, action);
    } catch {
      illegalActionCount += 1;
      break;
    }

    actions += 1;
    cardInvariantOk =
      cardInvariantOk && multiplayerCardInvariantHolds(state);
    if (!cardInvariantOk) break;
  }

  return {
    terminated: state.phase === "finished",
    actions,
    illegalActionCount,
    cardInvariantOk,
    finalState: state
  };
}
