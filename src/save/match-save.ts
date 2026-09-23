import { RANKS, SUITS, type Card } from "../core/cards";
import type { GameState, TablePair } from "../core/game-types";
import type { KeyValueStorage } from "./storage";

export type { KeyValueStorage } from "./storage";

export const CURRENT_MATCH_KEY = "durak.currentMatch.v1";

export type MatchSaveV1 = Readonly<{
  schemaVersion: 1;
  savedAtMs: number;
  state: GameState;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCard(value: unknown): value is Card {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    SUITS.includes(value.suit as (typeof SUITS)[number]) &&
    RANKS.includes(value.rank as (typeof RANKS)[number])
  );
}

function collectStateCards(state: GameState): Card[] {
  return [
    ...state.hands.human,
    ...state.hands.bot,
    ...state.talon,
    ...state.discard,
    ...state.table.flatMap((pair: TablePair) => [
      pair.attack,
      ...(pair.defense ? [pair.defense] : [])
    ])
  ];
}

function validateState(value: unknown): asserts value is GameState {
  if (!isRecord(value)) throw new Error("Invalid save: missing state");

  const required = [
    "schemaVersion",
    "seed",
    "hands",
    "talon",
    "trumpCard",
    "discard",
    "table",
    "attackerId",
    "defenderId",
    "activePlayerId",
    "phase",
    "defenderHandSizeAtBoutStart",
    "result",
    "turnNumber"
  ];
  for (const key of required) {
    if (!(key in value)) throw new Error(`Invalid save: missing ${key}`);
  }
  if (value.schemaVersion !== 1) throw new Error("Unsupported save state version");

  const state = value as unknown as GameState;
  if (!isRecord(state.hands)) throw new Error("Invalid save: hands");
  if (!Array.isArray(state.hands.human) || !Array.isArray(state.hands.bot)) {
    throw new Error("Invalid save: hands");
  }
  if (!Array.isArray(state.talon) || !Array.isArray(state.discard) || !Array.isArray(state.table)) {
    throw new Error("Invalid save: card zones");
  }
  if (!isCard(state.trumpCard)) throw new Error("Invalid save: trump card");

  const cards = collectStateCards(state);
  if (cards.length !== 36 || cards.some((card) => !isCard(card))) {
    throw new Error("Invalid save: expected 36 valid cards");
  }
  const ids = cards.map((card) => card.id);
  if (new Set(ids).size !== 36) {
    throw new Error("Invalid save: duplicate cards");
  }
  if (!ids.includes(state.trumpCard.id)) {
    throw new Error("Invalid save: trump card not in game zones");
  }
}

export function serializeMatch(state: GameState, savedAtMs: number): string {
  const payload: MatchSaveV1 = { schemaVersion: 1, savedAtMs, state };
  return JSON.stringify(payload);
}

export function deserializeMatch(serialized: string): MatchSaveV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Invalid save: malformed JSON");
  }

  if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
    throw new Error("Unsupported save");
  }
  if (typeof parsed.savedAtMs !== "number" || !Number.isFinite(parsed.savedAtMs)) {
    throw new Error("Invalid save: savedAtMs");
  }
  validateState(parsed.state);

  return parsed as unknown as MatchSaveV1;
}

export function saveCurrentMatch(
  storage: KeyValueStorage,
  state: GameState,
  nowMs: number
): void {
  storage.setItem(CURRENT_MATCH_KEY, serializeMatch(state, nowMs));
}

export function loadCurrentMatch(storage: KeyValueStorage): GameState | null {
  const serialized = storage.getItem(CURRENT_MATCH_KEY);
  if (serialized === null) return null;

  try {
    return deserializeMatch(serialized).state;
  } catch {
    storage.removeItem(CURRENT_MATCH_KEY);
    return null;
  }
}
