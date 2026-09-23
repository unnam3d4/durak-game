import { describe, expect, it } from "vitest";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  saveCurrentMultiplayerMatch
} from "../../src/save/multiplayer-match-save";
import type { KeyValueStorage } from "../../src/save/storage";
import {
  CURRENT_RANKED_CONTEXT_KEY,
  loadRankedMatchContext,
  rankedContextMatchesState,
  removeRankedMatchContext,
  saveRankedMatchContext
} from "../../src/save/ranked-match-context-save";
import type { RankedMatchContextV1 } from "../../src/matchmaking/ranked-match-context";

function memoryStorage(
  initial: Record<string, string> = {}
): KeyValueStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    }
  };
}

function context(): RankedMatchContextV1 {
  return {
    schemaVersion: 1,
    matchSeed: 12345,
    participantCount: 3,
    playerRatingAtStart: 1376,
    ratingEligible: true,
    opponents: [
      {
        participantId: "bot",
        nickname: "VIKTOR",
        hiddenRating: 1320,
        skill: "normal"
      },
      {
        participantId: "bot2",
        nickname: "Maks77",
        hiddenRating: 1450,
        skill: "normal"
      }
    ]
  };
}

describe("ranked match context storage", () => {
  it("round-trips exact opponent identity and hidden strength", () => {
    const storage = memoryStorage();
    const expected = context();

    saveRankedMatchContext(storage, expected);

    expect(loadRankedMatchContext(storage)).toEqual(expected);
  });

  it("detects a context that belongs to a different rule state", () => {
    const expected = context();
    const matching = createMultiplayerMatch(
      expected.matchSeed,
      expected.participantCount
    );
    const wrongSeed = createMultiplayerMatch(
      expected.matchSeed + 1,
      expected.participantCount
    );
    const wrongCount = createMultiplayerMatch(
      expected.matchSeed,
      4
    );

    expect(rankedContextMatchesState(expected, matching)).toBe(true);
    expect(rankedContextMatchesState(expected, wrongSeed)).toBe(false);
    expect(rankedContextMatchesState(expected, wrongCount)).toBe(false);
  });

  it("returns null for corrupt context without removing the rule-state save", () => {
    const storage = memoryStorage({
      [CURRENT_RANKED_CONTEXT_KEY]: "{broken"
    });
    const state = createMultiplayerMatch(777, 2);
    saveCurrentMultiplayerMatch(storage, state, 100);
    const before = storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY);

    expect(loadRankedMatchContext(storage)).toBeNull();
    expect(storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)).toBe(before);
  });

  it("rejects duplicate participant ids and normalized nicknames", () => {
    const duplicateSeat = {
      ...context(),
      opponents: [
        context().opponents[0]!,
        {
          ...context().opponents[1]!,
          participantId: "bot"
        }
      ]
    } satisfies RankedMatchContextV1;
    const duplicateName = {
      ...context(),
      opponents: [
        context().opponents[0]!,
        {
          ...context().opponents[1]!,
          nickname: "viktor"
        }
      ]
    } satisfies RankedMatchContextV1;

    const seatStorage = memoryStorage({
      [CURRENT_RANKED_CONTEXT_KEY]: JSON.stringify(duplicateSeat)
    });
    const nameStorage = memoryStorage({
      [CURRENT_RANKED_CONTEXT_KEY]: JSON.stringify(duplicateName)
    });

    expect(loadRankedMatchContext(seatStorage)).toBeNull();
    expect(loadRankedMatchContext(nameStorage)).toBeNull();
  });

  it("removes only the ranked context when explicitly cleared", () => {
    const storage = memoryStorage();
    const state = createMultiplayerMatch(12345, 3);
    saveCurrentMultiplayerMatch(storage, state, 100);
    saveRankedMatchContext(storage, context());

    removeRankedMatchContext(storage);

    expect(storage.getItem(CURRENT_RANKED_CONTEXT_KEY)).toBeNull();
    expect(storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)).not.toBeNull();
  });
});
