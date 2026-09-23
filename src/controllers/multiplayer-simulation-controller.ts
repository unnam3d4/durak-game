import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import { toMultiplayerPlayerView } from "../core/multiplayer-public-view";
import type {
  ParticipantCount,
  ParticipantId
} from "../core/participants";
import { createSeededRandom } from "../deck/random";
import { createMultiplayerMatch } from "../rules/create-multiplayer-match";
import { applyMultiplayerAction } from "../rules/multiplayer-reducer";
import type { BotSkill } from "./bot-controller";
import { MultiplayerBotController } from "./multiplayer-bot-controller";

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

export async function simulateMultiplayerMatch(
  seed: number,
  participantCount: ParticipantCount,
  maxActions = 3000,
  skill: BotSkill = "hard"
): Promise<MultiplayerSimulationResult> {
  let state = createMultiplayerMatch(seed, participantCount);
  let actions = 0;
  let illegalActionCount = 0;
  let cardInvariantOk = multiplayerCardInvariantHolds(state);

  const controllers: Record<ParticipantId, MultiplayerBotController> = {
    human: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x11111111),
      skill
    ),
    bot: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x22222222),
      skill
    ),
    bot2: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x33333333),
      skill
    ),
    bot3: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x44444444),
      skill
    )
  };

  while (state.phase !== "finished" && actions < maxActions) {
    const active = state.activePlayerId;
    try {
      const view = toMultiplayerPlayerView(state, active);
      const action = await controllers[active].requestAction(view);
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
