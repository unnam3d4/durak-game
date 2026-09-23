import type { KeyValueStorage } from "../save/storage";

export const PLAYER_PROFILE_KEY = "durak.playerProfile.v1";

export type PlayerProfile = Readonly<{
  schemaVersion: 1;
  nickname: string;
  createdAtMs: number;
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
    schemaVersion: 1,
    nickname,
    createdAtMs
  };
}

export function savePlayerProfile(
  storage: KeyValueStorage,
  profile: PlayerProfile
): void {
  storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
}

export function loadPlayerProfile(
  storage: KeyValueStorage
): PlayerProfile | null {
  const serialized = storage.getItem(PLAYER_PROFILE_KEY);
  if (serialized === null) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== 1 ||
      typeof parsed.nickname !== "string" ||
      nicknameValidationError(parsed.nickname) !== null ||
      typeof parsed.createdAtMs !== "number" ||
      !Number.isFinite(parsed.createdAtMs)
    ) {
      throw new Error("Invalid player profile");
    }

    return {
      schemaVersion: 1,
      nickname: normalizeNickname(parsed.nickname),
      createdAtMs: parsed.createdAtMs
    };
  } catch {
    storage.removeItem(PLAYER_PROFILE_KEY);
    return null;
  }
}
