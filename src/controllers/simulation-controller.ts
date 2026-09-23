import type { Card } from "../core/cards";
import type { GameState, PlayerId } from "../core/game-types";
import { toPlayerView } from "../core/public-view";
import { createSeededRandom } from "../deck/random";
import { applyAction } from "../rules/reducer";
import { createMatch1v1 } from "../rules/create-match";
import { BotController } from "./bot-controller";

export type SimulationOptions = Readonly<{
  maxActions: number;
}>;

export type SimulationResult = Readonly<{
  terminated: boolean;
  actions: number;
  cardInvariantOk: boolean;
  illegalActionCount: number;
  finalState: GameState;
}>;

function collectZoneCards(state: GameState): Card[] {
  return [
    ...state.hands.human,
    ...state.hands.bot,
    ...state.talon,
    ...state.discard,
    ...state.table.flatMap((pair) => [
      pair.attack,
      ...(pair.defense ? [pair.defense] : [])
    ])
  ];
}

export function cardInvariantHolds(state: GameState): boolean {
  const cards = collectZoneCards(state);
  return cards.length === 36 && new Set(cards.map((card) => card.id)).size === 36;
}

export async function simulateMatch(
  seed: number,
  options: SimulationOptions
): Promise<SimulationResult> {
  let state = createMatch1v1(seed);
  let actions = 0;
  let illegalActionCount = 0;
  let cardInvariantOk = cardInvariantHolds(state);
  const controllers: Record<PlayerId, BotController> = {
    human: new BotController(createSeededRandom(seed ^ 0x13579bdf)),
    bot: new BotController(createSeededRandom(seed ^ 0x2468ace0))
  };

  while (state.phase !== "finished" && actions < options.maxActions) {
    const active = state.activePlayerId;
    const view = toPlayerView(state, active);
    let action;
    try {
      action = await controllers[active].requestAction(view);
      state = applyAction(state, action);
    } catch {
      illegalActionCount += 1;
      break;
    }
    actions += 1;
    cardInvariantOk = cardInvariantOk && cardInvariantHolds(state);
    if (!cardInvariantOk) break;
  }

  return {
    terminated: state.phase === "finished",
    actions,
    cardInvariantOk,
    illegalActionCount,
    finalState: state
  };
}
