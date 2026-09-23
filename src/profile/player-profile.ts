import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import {
  createDefaultCosmeticInventory,
  isValidCosmeticInventory,
  type CosmeticInventory
} from "../data/cosmetics";
import type { KeyValueStorage } from "../save/storage";

export const PLAYER_PROFILE_KEY = "durak.playerProfile.v3";
export const LEGACY_V2_PROFILE_KEY = "durak.playerProfile.v2";
export const LEGACY_PLAYER_PROFILE_KEY = "durak.playerProfile.v1";

export type MatchStatsBucket = Readonly<{
  played: number;
  wins: number;
  losses: number;
  draws: number;
}>;

export type PlayerStats = Readonly<{
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  byVariant: Readonly<Record<MultiplayerVariant, MatchStatsBucket>>;
  byParticipants: Readonly<
    Record<"2" | "3" | "4", MatchStatsBucket>
  >;
}>;

export type PlayerProfile = Readonly<{
  schemaVersion: 3;
  nickname: string;
  createdAtMs: number;
  xp: number;
  rating: number;
  coins: number;
  stats: PlayerStats;
  achievements: readonly string[];
  cosmetics: CosmeticInventory;
}>;

type LegacyV2Profile = Readonly<{
  schemaVersion: 2;
  nickname: string;
  createdAtMs: number;
  xp: number;
  rating: number;
  coins: number;
  stats: PlayerStats;
  achievements: readonly string[];
}>;

const FALLBACK_NICKNAMES = [
  "Тузик",
  "Козырь",
  "Север",
  "Филин",
  "Бубна",
  "Шторм",
  "Барс",
  "Лис",
  "Маяк",
  "Ветер",
  "Клевер",
  "Спутник"
] as const;

const BLOCKED_NICKNAME_PATTERNS = [
  /хуй/iu,
  /хуе/iu,
  /пизд/iu,
  /еба/iu,
  /ёба/iu,
  /бля/iu,
  /fuck/iu,
  /shit/iu
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function emptyBucket(): MatchStatsBucket {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0
  };
}

export function createEmptyPlayerStats(): PlayerStats {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    byVariant: {
      podkidnoy: emptyBucket(),
      perevodnoy: emptyBucket()
    },
    byParticipants: {
      "2": emptyBucket(),
      "3": emptyBucket(),
      "4": emptyBucket()
    }
  };
}

function isStatsBucket(value: unknown): value is MatchStatsBucket {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value.played) &&
    isNonNegativeInteger(value.wins) &&
    isNonNegativeInteger(value.losses) &&
    isNonNegativeInteger(value.draws) &&
    value.played === value.wins + value.losses + value.draws
  );
}

function isPlayerStats(value: unknown): value is PlayerStats {
  if (!isRecord(value)) return false;
  if (
    !isNonNegativeInteger(value.matchesPlayed) ||
    !isNonNegativeInteger(value.wins) ||
    !isNonNegativeInteger(value.losses) ||
    !isNonNegativeInteger(value.draws) ||
    !isNonNegativeInteger(value.currentStreak) ||
    !isNonNegativeInteger(value.bestStreak) ||
    value.matchesPlayed !== value.wins + value.losses + value.draws ||
    value.bestStreak < value.currentStreak
  ) {
    return false;
  }

  if (!isRecord(value.byVariant) || !isRecord(value.byParticipants)) {
    return false;
  }

  return (
    isStatsBucket(value.byVariant.podkidnoy) &&
    isStatsBucket(value.byVariant.perevodnoy) &&
    isStatsBucket(value.byParticipants["2"]) &&
    isStatsBucket(value.byParticipants["3"]) &&
    isStatsBucket(value.byParticipants["4"])
  );
}

function isAchievements(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (achievement) =>
        typeof achievement === "string" &&
        achievement.length > 0
    ) &&
    new Set(value).size === value.length
  );
}

export function normalizeNickname(input: string): string {
  return input.trim();
}

export function nicknameValidationError(input: string): string | null {
  const nickname = normalizeNickname(input);
  const length = [...nickname].length;

  if (length < 3 || length > 16) {
    return "Имя должно содержать от 3 до 16 символов.";
  }

  if (!/^[A-Za-zА-Яа-яЁё0-9_]+$/u.test(nickname)) {
    return "Используйте буквы, цифры или знак _.";
  }

  if (
    BLOCKED_NICKNAME_PATTERNS.some((pattern) => pattern.test(nickname))
  ) {
    return "Выберите другое имя.";
  }

  return null;
}

export function fallbackNickname(seed: number): string {
  const index = (seed >>> 0) % FALLBACK_NICKNAMES.length;
  return FALLBACK_NICKNAMES[index]!;
}

export function createPlayerProfile(
  nicknameInput: string,
  createdAtMs: number
): PlayerProfile {
  const nickname = normalizeNickname(nicknameInput);
  const error = nicknameValidationError(nickname);
  if (error) throw new Error(error);

  if (!Number.isFinite(createdAtMs)) {
    throw new Error("Invalid profile creation time");
  }

  return {
    schemaVersion: 3,
    nickname,
    createdAtMs,
    xp: 0,
    rating: 0,
    coins: 0,
    stats: createEmptyPlayerStats(),
    achievements: [],
    cosmetics: createDefaultCosmeticInventory()
  };
}

export function renamePlayerProfile(
  profile: PlayerProfile,
  nicknameInput: string
): PlayerProfile {
  const nickname = normalizeNickname(nicknameInput);
  const error = nicknameValidationError(nickname);
  if (error) throw new Error(error);
  return {
    ...profile,
    nickname
  };
}

export function savePlayerProfile(
  storage: KeyValueStorage,
  profile: PlayerProfile
): void {
  storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
}

function commonProfileFieldsValid(
  parsed: Record<string, unknown>
): boolean {
  return (
    typeof parsed.nickname === "string" &&
    nicknameValidationError(parsed.nickname) === null &&
    typeof parsed.createdAtMs === "number" &&
    Number.isFinite(parsed.createdAtMs) &&
    isNonNegativeInteger(parsed.xp) &&
    isNonNegativeInteger(parsed.rating) &&
    isNonNegativeInteger(parsed.coins) &&
    isPlayerStats(parsed.stats) &&
    isAchievements(parsed.achievements)
  );
}

function parseV3Profile(serialized: string): PlayerProfile {
  const parsed: unknown = JSON.parse(serialized);
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 3 ||
    !commonProfileFieldsValid(parsed) ||
    !isValidCosmeticInventory(parsed.cosmetics)
  ) {
    throw new Error("Invalid player profile");
  }

  return {
    schemaVersion: 3,
    nickname: normalizeNickname(parsed.nickname as string),
    createdAtMs: parsed.createdAtMs as number,
    xp: parsed.xp as number,
    rating: parsed.rating as number,
    coins: parsed.coins as number,
    stats: parsed.stats as PlayerStats,
    achievements: [...(parsed.achievements as string[])],
    cosmetics: parsed.cosmetics
  };
}

function parseV2Profile(serialized: string): LegacyV2Profile {
  const parsed: unknown = JSON.parse(serialized);
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 2 ||
    !commonProfileFieldsValid(parsed)
  ) {
    throw new Error("Invalid v2 player profile");
  }

  return {
    schemaVersion: 2,
    nickname: normalizeNickname(parsed.nickname as string),
    createdAtMs: parsed.createdAtMs as number,
    xp: parsed.xp as number,
    rating: parsed.rating as number,
    coins: parsed.coins as number,
    stats: parsed.stats as PlayerStats,
    achievements: [...(parsed.achievements as string[])]
  };
}

function upgradeV2Profile(profile: LegacyV2Profile): PlayerProfile {
  return {
    schemaVersion: 3,
    nickname: profile.nickname,
    createdAtMs: profile.createdAtMs,
    xp: profile.xp,
    rating: profile.rating,
    coins: profile.coins,
    stats: profile.stats,
    achievements: profile.achievements,
    cosmetics: createDefaultCosmeticInventory()
  };
}

function parseLegacyProfile(serialized: string): PlayerProfile {
  const parsed: unknown = JSON.parse(serialized);
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 1 ||
    typeof parsed.nickname !== "string" ||
    nicknameValidationError(parsed.nickname) !== null ||
    typeof parsed.createdAtMs !== "number" ||
    !Number.isFinite(parsed.createdAtMs)
  ) {
    throw new Error("Invalid legacy player profile");
  }

  return createPlayerProfile(parsed.nickname, parsed.createdAtMs);
}

function persistMigration(
  storage: KeyValueStorage,
  migrated: PlayerProfile,
  legacyKey: string
): PlayerProfile {
  savePlayerProfile(storage, migrated);
  storage.removeItem(legacyKey);
  return migrated;
}

export function loadPlayerProfile(
  storage: KeyValueStorage
): PlayerProfile | null {
  const current = storage.getItem(PLAYER_PROFILE_KEY);
  if (current !== null) {
    try {
      return parseV3Profile(current);
    } catch {
      storage.removeItem(PLAYER_PROFILE_KEY);
    }
  }

  const v2 = storage.getItem(LEGACY_V2_PROFILE_KEY);
  if (v2 !== null) {
    try {
      return persistMigration(
        storage,
        upgradeV2Profile(parseV2Profile(v2)),
        LEGACY_V2_PROFILE_KEY
      );
    } catch {
      storage.removeItem(LEGACY_V2_PROFILE_KEY);
    }
  }

  const legacy = storage.getItem(LEGACY_PLAYER_PROFILE_KEY);
  if (legacy === null) return null;

  try {
    return persistMigration(
      storage,
      parseLegacyProfile(legacy),
      LEGACY_PLAYER_PROFILE_KEY
    );
  } catch {
    storage.removeItem(LEGACY_PLAYER_PROFILE_KEY);
    return null;
  }
}
