import { isBlockedNickname } from "./nickname-filter";

export const INITIAL_RATING = 1000;

export type PlayerProfileV1 = Readonly<{
  schemaVersion: 1;
  nickname: string;
  xp: number;
  rating: number;
  matchesCompleted: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  createdAtMs: number;
  updatedAtMs: number;
}>;

export type NicknameValidationResult =
  | Readonly<{ ok: true; nickname: string }>
  | Readonly<{
      ok: false;
      reason: "required" | "length" | "characters" | "blocked";
    }>;

const NICKNAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9_]{3,16}$/u;

export function normalizeNickname(value: string): string {
  return value.trim().normalize("NFKC");
}

export function validateNickname(
  value: string
): NicknameValidationResult {
  const nickname = normalizeNickname(value);

  if (nickname.length === 0) {
    return { ok: false, reason: "required" };
  }
  if (nickname.length < 3 || nickname.length > 16) {
    return { ok: false, reason: "length" };
  }
  if (!NICKNAME_PATTERN.test(nickname)) {
    return { ok: false, reason: "characters" };
  }
  if (isBlockedNickname(nickname)) {
    return { ok: false, reason: "blocked" };
  }

  return { ok: true, nickname };
}
