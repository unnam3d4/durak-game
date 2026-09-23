import type { MultiplayerGameState } from "../../src/core/multiplayer-game-types";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";

export function makeMultiplayerState(
  overrides: Partial<MultiplayerGameState> = {},
  participantCount: 2 | 3 | 4 = 3
): MultiplayerGameState {
  const base = createMultiplayerMatch(424242, participantCount);
  return {
    ...base,
    ...overrides,
    hands: overrides.hands ?? base.hands,
    table: overrides.table ?? base.table,
    talon: overrides.talon ?? base.talon,
    discard: overrides.discard ?? base.discard,
    finishOrder: overrides.finishOrder ?? base.finishOrder
  };
}
