import type { KeyValueStorage } from "../save/storage";
import {
  ACHIEVEMENTS
} from "../data/achievements";
import {
  sanitizeCosmeticInventory
} from "../data/cosmetics";
import {
  createDefaultPlayerMeta,
  type MatchStatsBucket,
  type PlayerMetaStats,
  type PlayerMetaV1
} from "./player-meta";

export const PLAYER_META_KEY = "durak.playerMeta.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonnegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function validBucket(value: unknown): value is MatchStatsBucket {
  if (!isRecord(value)) return false;
  return (
    nonnegativeInteger(value.played) &&
    nonnegativeInteger(value.wins) &&
    nonnegativeInteger(value.losses) &&
    value.played === value.wins + value.losses
  );
}

function validStats(value: unknown): value is PlayerMetaStats {
  if (!isRecord(value)) return false;
  if (
    !nonnegativeInteger(value.matchesPlayed) ||
    !nonnegativeInteger(value.wins) ||
    !nonnegativeInteger(value.losses) ||
    !nonnegativeInteger(value.technicalLosses) ||
    !nonnegativeInteger(value.surrenders) ||
    !nonnegativeInteger(value.currentStreak) ||
    !nonnegativeInteger(value.bestStreak) ||
    value.matchesPlayed !== value.wins + value.losses ||
    value.bestStreak < value.currentStreak
  ) {
    return false;
  }

  if (!isRecord(value.byVariant) || !isRecord(value.byParticipants)) {
    return false;
  }

  return (
    validBucket(value.byVariant.podkidnoy) &&
    validBucket(value.byVariant.perevodnoy) &&
    validBucket(value.byParticipants["2"]) &&
    validBucket(value.byParticipants["3"]) &&
    validBucket(value.byParticipants["4"])
  );
}

export function sanitizePlayerMeta(
  value: unknown
): PlayerMetaV1 | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  const cosmetics = sanitizeCosmeticInventory(value.cosmetics);

  if (
    !nonnegativeInteger(value.coins) ||
    !validStats(value.stats) ||
    !Array.isArray(value.achievements) ||
    cosmetics === null ||
    !isRecord(value.dailyReward) ||
    !nonnegativeInteger(value.dailyReward.streak) ||
    !nonnegativeInteger(value.updatedAtMs)
  ) {
    return null;
  }

  const lastClaimUtcDay = value.dailyReward.lastClaimUtcDay;
  if (
    lastClaimUtcDay !== null &&
    typeof lastClaimUtcDay !== "string"
  ) {
    return null;
  }

  const knownAchievements = new Set(
    ACHIEVEMENTS.map((achievement) => achievement.id)
  );
  const achievements = value.achievements;
  if (
    !achievements.every(
      (id) => typeof id === "string" && knownAchievements.has(id)
    ) ||
    new Set(achievements).size !== achievements.length
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    coins: value.coins,
    stats: value.stats,
    achievements: [...achievements],
    cosmetics,
    dailyReward: {
      lastClaimUtcDay,
      streak: value.dailyReward.streak
    },
    updatedAtMs: value.updatedAtMs
  };
}

export function loadPlayerMeta(
  storage: KeyValueStorage
): PlayerMetaV1 | null {
  const raw = storage.getItem(PLAYER_META_KEY);
  if (raw === null) return null;

  try {
    return sanitizePlayerMeta(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadOrCreatePlayerMeta(
  storage: KeyValueStorage,
  nowMs = 0
): PlayerMetaV1 {
  return loadPlayerMeta(storage) ?? createDefaultPlayerMeta(nowMs);
}

export function savePlayerMeta(
  storage: KeyValueStorage,
  meta: PlayerMetaV1
): void {
  const sanitized = sanitizePlayerMeta(meta);
  if (!sanitized) throw new Error("Invalid player meta");
  storage.setItem(PLAYER_META_KEY, JSON.stringify(sanitized));
}
