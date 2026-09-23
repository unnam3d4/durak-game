import type { KeyValueStorage } from "../save/storage";
import {
  validateNickname,
  type PlayerProfileV1
} from "./player-profile";

export const PLAYER_PROFILE_KEY = "durak.playerProfile.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNonnegative(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function sanitizeProfile(value: unknown): PlayerProfileV1 | null {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return null;
  }

  const nicknameResult =
    typeof value.nickname === "string"
      ? validateNickname(value.nickname)
      : null;
  if (!nicknameResult?.ok) {
    return null;
  }

  if (
    !isFiniteNonnegative(value.xp) ||
    typeof value.rating !== "number" ||
    !Number.isFinite(value.rating) ||
    !isFiniteNonnegative(value.matchesCompleted) ||
    !isFiniteNonnegative(value.wins) ||
    !isFiniteNonnegative(value.currentStreak) ||
    !isFiniteNonnegative(value.bestStreak) ||
    !isFiniteNonnegative(value.createdAtMs) ||
    !isFiniteNonnegative(value.updatedAtMs)
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    nickname: nicknameResult.nickname,
    xp: value.xp,
    rating: Math.max(0, value.rating),
    matchesCompleted: value.matchesCompleted,
    wins: value.wins,
    currentStreak: value.currentStreak,
    bestStreak: value.bestStreak,
    createdAtMs: value.createdAtMs,
    updatedAtMs: value.updatedAtMs
  };
}

export function loadPlayerProfile(
  storage: KeyValueStorage
): PlayerProfileV1 | null {
  const raw = storage.getItem(PLAYER_PROFILE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return sanitizeProfile(parsed);
}

export function savePlayerProfile(
  storage: KeyValueStorage,
  profile: PlayerProfileV1
): void {
  const sanitized = sanitizeProfile(profile);
  if (!sanitized) {
    throw new Error("Invalid player profile");
  }
  storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(sanitized));
}
