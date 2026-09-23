import { describe, expect, it } from "vitest";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  deserializeMultiplayerMatch,
  loadCurrentMultiplayerMatch,
  saveCurrentMultiplayerMatch,
  serializeMultiplayerMatch
} from "../../src/save/multiplayer-match-save";
import type { KeyValueStorage } from "../../src/save/storage";
import { createMultiplayerMatch } from "../../src/rules/create-multiplayer-match";

function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key)
  };
}

describe("multiplayer match save", () => {
  it("round-trips an in-progress four-player match exactly", () => {
    const state = createMultiplayerMatch(12345, 4);
    const encoded = serializeMultiplayerMatch(state, 987654);
    const decoded = deserializeMultiplayerMatch(encoded);

    expect(decoded.savedAtMs).toBe(987654);
    expect(decoded.state).toEqual(state);
  });

  it("preserves deterministic talon order and participant rotation", () => {
    const state = createMultiplayerMatch(54321, 3);
    const storage = createMemoryStorage();

    saveCurrentMultiplayerMatch(storage, state, 1000);
    const restored = loadCurrentMultiplayerMatch(storage)!;

    expect(restored.talon.map((card) => card.id)).toEqual(
      state.talon.map((card) => card.id)
    );
    expect(restored.participants).toEqual(state.participants);
    expect(restored.attackerId).toBe(state.attackerId);
    expect(restored.defenderId).toBe(state.defenderId);
    expect(restored.activePlayerId).toBe(state.activePlayerId);
  });

  it("rejects duplicated physical cards", () => {
    const state = createMultiplayerMatch(123, 3);
    const duplicate = state.hands.human[0]!;
    const corrupt = {
      schemaVersion: 2,
      savedAtMs: 123,
      state: {
        ...state,
        hands: {
          ...state.hands,
          human: [...state.hands.human, duplicate]
        }
      }
    };

    expect(() =>
      deserializeMultiplayerMatch(JSON.stringify(corrupt))
    ).toThrow("expected 36 valid cards");
  });

  it("rejects cards stored in an inactive seat", () => {
    const state = createMultiplayerMatch(123, 2);
    const stolen = state.hands.human[0]!;
    const corrupt = {
      schemaVersion: 2,
      savedAtMs: 123,
      state: {
        ...state,
        hands: {
          ...state.hands,
          human: state.hands.human.slice(1),
          bot2: [stolen]
        }
      }
    };

    expect(() =>
      deserializeMultiplayerMatch(JSON.stringify(corrupt))
    ).toThrow("inactive participant hand");
  });

  it("removes corrupt storage and returns null", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      CURRENT_MULTIPLAYER_MATCH_KEY,
      '{"schemaVersion":99}'
    );

    expect(loadCurrentMultiplayerMatch(storage)).toBeNull();
    expect(storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY)).toBeNull();
  });

  it("round-trips the latest public take event", () => {
    const state = createMultiplayerMatch(222, 3);
    const taken = state.hands.bot2[0]!;
    const withEvent = {
      ...state,
      lastTakeEvent: {
        id: 7,
        defenderId: "bot2" as const,
        cards: [taken],
        triggerAttack: taken
      }
    };

    const decoded = deserializeMultiplayerMatch(
      serializeMultiplayerMatch(withEvent, 2000)
    );

    expect(decoded.state.lastTakeEvent).toEqual(withEvent.lastTakeEvent);
  });

  it("rejects a malformed take-event card identity", () => {
    const state = createMultiplayerMatch(333, 3);
    const fake = {
      id: "clubs-99",
      suit: "clubs",
      rank: 9
    };
    const corrupt = {
      schemaVersion: 2,
      savedAtMs: 123,
      state: {
        ...state,
        lastTakeEvent: {
          id: 8,
          defenderId: "bot2",
          cards: [fake],
          triggerAttack: fake
        }
      }
    };

    expect(() =>
      deserializeMultiplayerMatch(JSON.stringify(corrupt))
    ).toThrow("lastTakeEvent.cards");
  });

  it("rejects a card whose id does not match its suit and rank", () => {
    const state = createMultiplayerMatch(444, 3);
    const original = state.hands.human[0]!;
    const corrupt = {
      schemaVersion: 2,
      savedAtMs: 123,
      state: {
        ...state,
        hands: {
          ...state.hands,
          human: [
            {
              ...original,
              id: "spades-14"
            },
            ...state.hands.human.slice(1)
          ]
        }
      }
    };

    expect(() =>
      deserializeMultiplayerMatch(JSON.stringify(corrupt))
    ).toThrow("invalid card identity");
  });

  it("round-trips a Perevodnoy match variant", () => {
    const state = createMultiplayerMatch(555, 4, "perevodnoy");
    const decoded = deserializeMultiplayerMatch(
      serializeMultiplayerMatch(state, 3000)
    );

    expect(decoded.state.variant).toBe("perevodnoy");
  });

  it("rejects an unknown multiplayer variant", () => {
    const state = createMultiplayerMatch(556, 3);
    const corrupt = {
      schemaVersion: 2,
      savedAtMs: 123,
      state: {
        ...state,
        variant: "unknown"
      }
    };

    expect(() =>
      deserializeMultiplayerMatch(JSON.stringify(corrupt))
    ).toThrow("variant");
  });

  it("migrates pre-variant multiplayer v2 saves to Podkidnoy", () => {
    const state = createMultiplayerMatch(557, 3);
    const { variant: _variant, ...legacyState } = state;
    const legacy = {
      schemaVersion: 2,
      savedAtMs: 123,
      state: legacyState
    };

    const decoded = deserializeMultiplayerMatch(
      JSON.stringify(legacy)
    );

    expect(decoded.state.variant).toBe("podkidnoy");
  });
});
