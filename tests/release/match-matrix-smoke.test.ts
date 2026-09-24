import { describe, expect, it } from "vitest";
import type { ParticipantId } from "../../src/core/participants";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import { toMultiplayerPlayerView } from "../../src/core/multiplayer-public-view";
import { createBotController } from "../../src/controllers/multiplayer-bot-controller";
import { createSeededRandom } from "../../src/deck/random";
import type {
  MultiplayerGameState,
  MultiplayerVariant
} from "../../src/core/multiplayer-game-types";
import type { ParticipantCount } from "../../src/core/participants";

function allPhysicalCardIds(
  state: MultiplayerGameState
): readonly string[] {
  return [
    ...state.participants.flatMap((id) =>
      state.hands[id].map((card) => card.id)
    ),
    ...state.talon.map((card) => card.id),
    ...state.discard.map((card) => card.id),
    ...state.table.flatMap((pair) => [
      pair.attack.id,
      ...(pair.defense ? [pair.defense.id] : [])
    ]),
    ...state.forfeitPile.map((card) => card.id)
  ];
}

async function playToCompletion(
  seed: number,
  participantCount: ParticipantCount,
  variant: MultiplayerVariant
): Promise<MultiplayerGameState> {
  let state = createMultiplayerMatch(
    seed,
    participantCount,
    variant
  );

  const controllers = new Map(
    state.participants.map((participantId, index) => [
      participantId,
      createBotController(
        createSeededRandom(
          (seed ^ ((index + 1) * 0x9e3779b9)) >>> 0
        ),
        seed,
        participantId,
        "hard"
      )
    ])
  );

  for (let step = 0; step < 5000; step += 1) {
    if (state.phase === "finished") return state;

    const active = state.activePlayerId as ParticipantId;
    const controller = controllers.get(active);
    if (!controller) {
      throw new Error(`Missing controller for ${active}`);
    }

    const view = toMultiplayerPlayerView(state, active);
    expect(view.legalActions.length).toBeGreaterThan(0);
    const action = await controller.requestAction(view);
    state = applyMultiplayerAction(state, action);
  }

  throw new Error(
    `Match did not finish: ${variant}, ${participantCount} players, seed ${seed}`
  );
}

describe("release match matrix smoke", () => {
  for (const variant of ["podkidnoy", "perevodnoy"] as const) {
    for (const participantCount of [2, 3, 4] as const) {
      it(`finishes ${variant} with ${participantCount} players while conserving all cards`, async () => {
        for (const seed of [7, 113, 2026]) {
          const state = await playToCompletion(
            seed,
            participantCount,
            variant
          );

          expect(state.phase).toBe("finished");
          const ids = allPhysicalCardIds(state);
          expect(ids).toHaveLength(36);
          expect(new Set(ids).size).toBe(36);
          expect(
            state.finishOrder.length +
              state.forfeitOrder.length +
              (state.foolId ? 1 : 0)
          ).toBeGreaterThanOrEqual(participantCount - 1);
        }
      });
    }
  }
});
