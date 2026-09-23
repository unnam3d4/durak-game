import type { Card } from "../core/cards";
import type { GameState, PlayerId } from "../core/game-types";

function tableCards(state: GameState): Card[] {
  return state.table.flatMap((pair) => [
    pair.attack,
    ...(pair.defense ? [pair.defense] : [])
  ]);
}

export function refillHands(state: GameState): GameState {
  const hands: Record<PlayerId, Card[]> = {
    human: [...state.hands.human],
    bot: [...state.hands.bot]
  };
  const talon = [...state.talon];
  const order: PlayerId[] = [state.attackerId, state.defenderId];

  for (const playerId of order) {
    while (hands[playerId].length < 6 && talon.length > 0) {
      hands[playerId].push(talon.shift()!);
    }
  }

  return { ...state, hands, talon };
}

export function resolveMatchResult(state: GameState): GameState {
  if (state.talon.length > 0) return state;

  const humanEmpty = state.hands.human.length === 0;
  const botEmpty = state.hands.bot.length === 0;

  if (humanEmpty && botEmpty) {
    return { ...state, phase: "finished", result: { kind: "draw" } };
  }

  if (humanEmpty) {
    return {
      ...state,
      phase: "finished",
      result: { kind: "winner", winner: "human", loser: "bot" }
    };
  }

  if (botEmpty) {
    return {
      ...state,
      phase: "finished",
      result: { kind: "winner", winner: "bot", loser: "human" }
    };
  }

  return state;
}

export function resolveTake(state: GameState): GameState {
  const collected = tableCards(state);
  const hands: Record<PlayerId, Card[]> = {
    human: [...state.hands.human],
    bot: [...state.hands.bot]
  };
  hands[state.defenderId].push(...collected);

  const cleared: GameState = {
    ...state,
    hands,
    table: [],
    phase: "attack",
    activePlayerId: state.attackerId,
    result: null
  };

  const refilled = refillHands(cleared);
  const ready: GameState = {
    ...refilled,
    defenderHandSizeAtBoutStart: refilled.hands[refilled.defenderId].length
  };
  return resolveMatchResult(ready);
}

export function resolveSuccessfulBout(state: GameState): GameState {
  const completedCards = tableCards(state);
  const cleared: GameState = {
    ...state,
    discard: [...state.discard, ...completedCards],
    table: [],
    result: null
  };

  const refilled = refillHands(cleared);
  const nextAttacker = state.defenderId;
  const nextDefender = state.attackerId;
  const ready: GameState = {
    ...refilled,
    attackerId: nextAttacker,
    defenderId: nextDefender,
    activePlayerId: nextAttacker,
    phase: "attack",
    defenderHandSizeAtBoutStart: refilled.hands[nextDefender].length
  };

  return resolveMatchResult(ready);
}
