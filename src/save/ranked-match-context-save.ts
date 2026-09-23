import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import {
  participantOrder,
  type ParticipantCount,
  type ParticipantId
} from "../core/participants";
import type { RankedMatchContextV1 } from "../matchmaking/ranked-match-context";
import type { OpponentSeatProfile } from "../matchmaking/opponent-profiles";
import type { BotSkill } from "../controllers/bot-controller";
import type { KeyValueStorage } from "./storage";

export const CURRENT_RANKED_CONTEXT_KEY =
  "durak.currentRankedContext.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isParticipantCount(value: unknown): value is ParticipantCount {
  return value === 2 || value === 3 || value === 4;
}

function isBotParticipantId(
  value: unknown
): value is Exclude<ParticipantId, "human"> {
  return value === "bot" || value === "bot2" || value === "bot3";
}

function isBotSkill(value: unknown): value is BotSkill {
  return value === "easy" || value === "normal" || value === "hard";
}

function normalizedName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function parseOpponent(value: unknown): OpponentSeatProfile | null {
  if (!isRecord(value)) return null;
  if (
    !isBotParticipantId(value.participantId) ||
    typeof value.nickname !== "string" ||
    normalizedName(value.nickname).length === 0 ||
    typeof value.hiddenRating !== "number" ||
    !Number.isFinite(value.hiddenRating) ||
    value.hiddenRating < 0 ||
    !isBotSkill(value.skill)
  ) {
    return null;
  }

  return {
    participantId: value.participantId,
    nickname: value.nickname.normalize("NFKC").trim(),
    hiddenRating: value.hiddenRating,
    skill: value.skill
  };
}

function parseContext(value: unknown): RankedMatchContextV1 | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.matchSeed !== "number" ||
    !Number.isInteger(value.matchSeed) ||
    value.matchSeed < 0 ||
    value.matchSeed > 0xffff_ffff ||
    !isParticipantCount(value.participantCount) ||
    typeof value.playerRatingAtStart !== "number" ||
    !Number.isFinite(value.playerRatingAtStart) ||
    value.playerRatingAtStart < 0 ||
    typeof value.ratingEligible !== "boolean" ||
    !Array.isArray(value.opponents)
  ) {
    return null;
  }

  const opponents = value.opponents.map(parseOpponent);
  if (opponents.some((opponent) => opponent === null)) {
    return null;
  }

  const typed = opponents as OpponentSeatProfile[];
  if (typed.length !== value.participantCount - 1) return null;

  const expectedIds = new Set(
    participantOrder(value.participantCount).slice(1)
  );
  const ids = typed.map((opponent) => opponent.participantId);
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !expectedIds.has(id))
  ) {
    return null;
  }

  const nicknameKeys = typed.map((opponent) =>
    normalizedName(opponent.nickname)
  );
  if (new Set(nicknameKeys).size !== nicknameKeys.length) {
    return null;
  }

  return {
    schemaVersion: 1,
    matchSeed: value.matchSeed,
    participantCount: value.participantCount,
    playerRatingAtStart: value.playerRatingAtStart,
    opponents: typed,
    ratingEligible: value.ratingEligible
  };
}

export function saveRankedMatchContext(
  storage: KeyValueStorage,
  context: RankedMatchContextV1
): void {
  const parsed = parseContext(context);
  if (!parsed) throw new Error("Invalid ranked match context");
  storage.setItem(CURRENT_RANKED_CONTEXT_KEY, JSON.stringify(parsed));
}

export function loadRankedMatchContext(
  storage: KeyValueStorage
): RankedMatchContextV1 | null {
  const raw = storage.getItem(CURRENT_RANKED_CONTEXT_KEY);
  if (raw === null) return null;

  try {
    return parseContext(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function removeRankedMatchContext(
  storage: KeyValueStorage
): void {
  storage.removeItem(CURRENT_RANKED_CONTEXT_KEY);
}

export function rankedContextMatchesState(
  context: RankedMatchContextV1,
  state: MultiplayerGameState
): boolean {
  return (
    context.matchSeed === state.seed &&
    context.participantCount === state.participants.length
  );
}
