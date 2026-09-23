import { describe, expect, it } from "vitest";
import {
  deserializeMatch,
  loadCurrentMatch,
  saveCurrentMatch,
  serializeMatch,
  type KeyValueStorage
} from "../../src/save/match-save";
import { makeDefenseStateWithCardsOnTable } from "../support/match-fixtures";

function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key)
  };
}

describe("match save", () => {
  it("round-trips an in-progress defense without changing state", () => {
    const state = makeDefenseStateWithCardsOnTable();
    const encoded = serializeMatch(state, 123456);
    const decoded = deserializeMatch(encoded);
    expect(decoded.state).toEqual(state);
    expect(decoded.savedAtMs).toBe(123456);
  });

  it("preserves deck order, table, active player, and defender after reload", () => {
    const state = makeDefenseStateWithCardsOnTable();
    const storage = createMemoryStorage();
    saveCurrentMatch(storage, state, 555);
    const restored = loadCurrentMatch(storage)!;
    expect(restored.talon.map((c) => c.id)).toEqual(state.talon.map((c) => c.id));
    expect(restored.table).toEqual(state.table);
    expect(restored.activePlayerId).toBe(state.activePlayerId);
    expect(restored.defenderId).toBe(state.defenderId);
  });

  it("rejects malformed or unsupported save data", () => {
    expect(() => deserializeMatch('{"schemaVersion":99}')).toThrow("Unsupported save");
    expect(() => deserializeMatch("not-json")).toThrow("Invalid save");
  });

  it("removes corrupt storage and returns null", () => {
    const storage = createMemoryStorage();
    storage.setItem("durak.currentMatch.v1", '{"schemaVersion":99}');
    expect(loadCurrentMatch(storage)).toBeNull();
    expect(storage.getItem("durak.currentMatch.v1")).toBeNull();
  });

  it("rejects a card whose id does not match its suit and rank", () => {
    const state = makeDefenseStateWithCardsOnTable();
    const original = state.hands.human[0]!;
    const corrupt = {
      schemaVersion: 1,
      savedAtMs: 123,
      state: {
        ...state,
        hands: {
          ...state.hands,
          human: [
            {
              ...original,
              id: "not-the-card-id"
            },
            ...state.hands.human.slice(1)
          ]
        }
      }
    };

    expect(() =>
      deserializeMatch(JSON.stringify(corrupt))
    ).toThrow("invalid card identity");
  });
});
