import { describe, expect, it } from "vitest";
import { MultiplayerBotController } from "../../src/controllers/multiplayer-bot-controller";
import { multiplayerCardInvariantHolds } from "../../src/controllers/multiplayer-simulation-controller";
import { toMultiplayerPlayerView } from "../../src/core/multiplayer-public-view";
import type { ParticipantId } from "../../src/core/participants";
import { createSeededRandom } from "../../src/deck/random";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import { applyMultiplayerAction } from "../../src/rules/multiplayer-reducer";
import {
  deserializeMultiplayerMatch,
  serializeMultiplayerMatch
} from "../../src/save/multiplayer-match-save";

function controllersForSeed(
  seed: number
): Record<ParticipantId, MultiplayerBotController> {
  return {
    human: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x11111111),
      "hard"
    ),
    bot: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x22222222),
      "hard"
    ),
    bot2: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x33333333),
      "hard"
    ),
    bot3: new MultiplayerBotController(
      createSeededRandom(seed ^ 0x44444444),
      "hard"
    )
  };
}

describe("multiplayer save/resume simulation", () => {
  it.each([
    ["podkidnoy", 2],
    ["podkidnoy", 3],
    ["podkidnoy", 4],
    ["perevodnoy", 2],
    ["perevodnoy", 3],
    ["perevodnoy", 4]
  ] as const)(
    "survives repeated save/restore during complete %s %i-player matches",
    async (variant, participantCount) => {
      for (let seed = 1; seed <= 100; seed += 1) {
        let state = createMultiplayerMatch(
          seed,
          participantCount,
          variant
        );
        const controllers = controllersForSeed(seed);
        let actions = 0;

        while (state.phase !== "finished" && actions < 3000) {
          expect(multiplayerCardInvariantHolds(state)).toBe(true);

          const serialized = serializeMultiplayerMatch(
            state,
            actions * 1000
          );
          state = deserializeMultiplayerMatch(serialized).state;

          const active = state.activePlayerId;
          const view = toMultiplayerPlayerView(state, active);
          const action = await controllers[active].requestAction(view);
          state = applyMultiplayerAction(state, action);
          actions += 1;
        }

        expect(state.phase).toBe("finished");
        expect(state.variant).toBe(variant);
        expect(actions).toBeLessThan(3000);
        expect(multiplayerCardInvariantHolds(state)).toBe(true);
        expect(new Set(state.finishOrder).size).toBe(
          state.finishOrder.length
        );
        expect(state.boutFinishOrder).toEqual([]);
      }
    },
    30_000
  );
});
