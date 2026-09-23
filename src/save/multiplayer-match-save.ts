import { RANKS, SUITS, type Card } from "../core/cards";
import type { MatchPhase, TablePair } from "../core/game-types";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import {
  participantOrder,
  type ParticipantCount,
  type ParticipantId
} from "../core/participants";
import type { KeyValueStorage } from "./storage";

export const CURRENT_MULTIPLAYER_MATCH_KEY =
  "durak.currentMatch.multiplayer.v2";

export type MultiplayerMatchSaveV2 = Readonly<{
  schemaVersion: 2;
  savedAtMs: number;
  state: MultiplayerGameState;
}>;

const PARTICIPANTS: readonly ParticipantId[] = [
  "human",
  "bot",
  "bot2",
  "bot3"
];

const PHASES: readonly MatchPhase[] = [
  "attack",
  "defend",
  "throw-in",
  "taking",
  "finished"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParticipantId(value: unknown): value is ParticipantId {
  return (
    typeof value === "string" &&
    PARTICIPANTS.includes(value as ParticipantId)
  );
}

function isCard(value: unknown): value is Card {
  if (!isRecord(value)) return false;

  const validSuit =
    SUITS.includes(value.suit as (typeof SUITS)[number]);
  const validRank =
    RANKS.includes(value.rank as (typeof RANKS)[number]);
  if (
    typeof value.id !== "string" ||
    !validSuit ||
    !validRank
  ) {
    return false;
  }

  return value.id === `${value.suit}-${value.rank}`;
}

function isTablePair(value: unknown): value is TablePair {
  if (!isRecord(value) || !isCard(value.attack)) return false;
  return value.defense === undefined || isCard(value.defense);
}

function assertInteger(
  value: unknown,
  name: string,
  minimum = 0
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum
  ) {
    throw new Error(`Invalid multiplayer save: ${name}`);
  }
}

function collectPhysicalCards(state: MultiplayerGameState): Card[] {
  return [
    ...PARTICIPANTS.flatMap(
      (participantId) => state.hands[participantId]
    ),
    ...state.talon,
    ...state.discard,
    ...state.table.flatMap((pair) => [
      pair.attack,
      ...(pair.defense ? [pair.defense] : [])
    ])
  ];
}

function validateParticipants(value: unknown): asserts value is ParticipantId[] {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    value.length > 4 ||
    !value.every(isParticipantId) ||
    new Set(value).size !== value.length
  ) {
    throw new Error("Invalid multiplayer save: participants");
  }

  const expected = participantOrder(value.length as ParticipantCount);
  if (
    expected.length !== value.length ||
    expected.some((participantId, index) => participantId !== value[index])
  ) {
    throw new Error("Invalid multiplayer save: participant order");
  }
}

function validateState(value: unknown): asserts value is MultiplayerGameState {
  if (!isRecord(value)) {
    throw new Error("Invalid multiplayer save: missing state");
  }

  const required = [
    "schemaVersion",
    "seed",
    "variant",
    "participants",
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
    "finishOrder",
    "boutFinishOrder",
    "lastTakeEvent",
    "foolId",
    "throwInCursor",
    "consecutivePasses",
    "turnNumber"
  ];
  for (const key of required) {
    if (!(key in value)) {
      throw new Error(`Invalid multiplayer save: missing ${key}`);
    }
  }

  if (value.schemaVersion !== 2) {
    throw new Error("Unsupported multiplayer save state version");
  }

  if (
    value.variant !== "podkidnoy" &&
    value.variant !== "perevodnoy"
  ) {
    throw new Error("Invalid multiplayer save: variant");
  }

  validateParticipants(value.participants);
  const participants = value.participants;

  if (!isRecord(value.hands)) {
    throw new Error("Invalid multiplayer save: hands");
  }
  for (const participantId of PARTICIPANTS) {
    if (!Array.isArray(value.hands[participantId])) {
      throw new Error("Invalid multiplayer save: hands");
    }
  }

  const state = value as unknown as MultiplayerGameState;
  for (const participantId of PARTICIPANTS) {
    if (
      !participants.includes(participantId) &&
      state.hands[participantId].length > 0
    ) {
      throw new Error("Invalid multiplayer save: inactive participant hand");
    }
  }

  if (
    !Array.isArray(state.talon) ||
    !Array.isArray(state.discard) ||
    !Array.isArray(state.table)
  ) {
    throw new Error("Invalid multiplayer save: card zones");
  }
  if (!isCard(state.trumpCard)) {
    throw new Error("Invalid multiplayer save: trump card");
  }
  if (!state.table.every(isTablePair)) {
    throw new Error("Invalid multiplayer save: table");
  }

  const cards = collectPhysicalCards(state);
  if (cards.length !== 36) {
    throw new Error(
      "Invalid multiplayer save: expected 36 valid cards"
    );
  }
  if (cards.some((card) => !isCard(card))) {
    throw new Error("Invalid multiplayer save: invalid card identity");
  }
  const ids = cards.map((card) => card.id);
  if (new Set(ids).size !== 36) {
    throw new Error("Invalid multiplayer save: duplicate cards");
  }
  if (!ids.includes(state.trumpCard.id)) {
    throw new Error(
      "Invalid multiplayer save: trump card not in game zones"
    );
  }

  for (const participantId of [
    state.attackerId,
    state.defenderId,
    state.activePlayerId
  ]) {
    if (!participants.includes(participantId)) {
      throw new Error("Invalid multiplayer save: active participant");
    }
  }
  if (state.attackerId === state.defenderId) {
    throw new Error("Invalid multiplayer save: attacker equals defender");
  }

  if (!PHASES.includes(state.phase)) {
    throw new Error("Invalid multiplayer save: phase");
  }

  assertInteger(
    state.defenderHandSizeAtBoutStart,
    "defenderHandSizeAtBoutStart"
  );
  assertInteger(state.throwInCursor, "throwInCursor");
  assertInteger(state.consecutivePasses, "consecutivePasses");
  assertInteger(state.turnNumber, "turnNumber", 1);

  if (
    !Array.isArray(state.finishOrder) ||
    !state.finishOrder.every(isParticipantId) ||
    state.finishOrder.some(
      (participantId) => !participants.includes(participantId)
    ) ||
    new Set(state.finishOrder).size !== state.finishOrder.length
  ) {
    throw new Error("Invalid multiplayer save: finishOrder");
  }

  if (
    !Array.isArray(state.boutFinishOrder) ||
    !state.boutFinishOrder.every(isParticipantId) ||
    state.boutFinishOrder.some(
      (participantId) => !participants.includes(participantId)
    ) ||
    new Set(state.boutFinishOrder).size !== state.boutFinishOrder.length ||
    state.boutFinishOrder.some((participantId) =>
      state.finishOrder.includes(participantId)
    )
  ) {
    throw new Error("Invalid multiplayer save: boutFinishOrder");
  }

  if (state.lastTakeEvent !== null) {
    if (!isRecord(state.lastTakeEvent)) {
      throw new Error("Invalid multiplayer save: lastTakeEvent");
    }

    assertInteger(state.lastTakeEvent.id, "lastTakeEvent.id", 1);

    if (
      !isParticipantId(state.lastTakeEvent.defenderId) ||
      !participants.includes(state.lastTakeEvent.defenderId)
    ) {
      throw new Error(
        "Invalid multiplayer save: lastTakeEvent.defenderId"
      );
    }

    if (
      !Array.isArray(state.lastTakeEvent.cards) ||
      state.lastTakeEvent.cards.length === 0 ||
      !state.lastTakeEvent.cards.every(isCard) ||
      !isCard(state.lastTakeEvent.triggerAttack)
    ) {
      throw new Error("Invalid multiplayer save: lastTakeEvent.cards");
    }

    const takeIds = state.lastTakeEvent.cards.map((card) => card.id);
    if (
      new Set(takeIds).size !== takeIds.length ||
      takeIds.some((id) => !ids.includes(id)) ||
      !takeIds.includes(state.lastTakeEvent.triggerAttack.id)
    ) {
      throw new Error(
        "Invalid multiplayer save: lastTakeEvent references"
      );
    }
  }

  if (
    state.foolId !== null &&
    (!isParticipantId(state.foolId) ||
      !participants.includes(state.foolId))
  ) {
    throw new Error("Invalid multiplayer save: foolId");
  }
}

export function serializeMultiplayerMatch(
  state: MultiplayerGameState,
  savedAtMs: number
): string {
  const payload: MultiplayerMatchSaveV2 = {
    schemaVersion: 2,
    savedAtMs,
    state
  };
  return JSON.stringify(payload);
}

export function deserializeMultiplayerMatch(
  serialized: string
): MultiplayerMatchSaveV2 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Invalid multiplayer save: malformed JSON");
  }

  if (!isRecord(parsed) || parsed.schemaVersion !== 2) {
    throw new Error("Unsupported multiplayer save");
  }
  if (
    typeof parsed.savedAtMs !== "number" ||
    !Number.isFinite(parsed.savedAtMs)
  ) {
    throw new Error("Invalid multiplayer save: savedAtMs");
  }

  validateState(parsed.state);
  return parsed as unknown as MultiplayerMatchSaveV2;
}

export function saveCurrentMultiplayerMatch(
  storage: KeyValueStorage,
  state: MultiplayerGameState,
  nowMs: number
): void {
  storage.setItem(
    CURRENT_MULTIPLAYER_MATCH_KEY,
    serializeMultiplayerMatch(state, nowMs)
  );
}

export function loadCurrentMultiplayerMatch(
  storage: KeyValueStorage
): MultiplayerGameState | null {
  const serialized = storage.getItem(CURRENT_MULTIPLAYER_MATCH_KEY);
  if (serialized === null) return null;

  try {
    return deserializeMultiplayerMatch(serialized).state;
  } catch {
    storage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
    return null;
  }
}
