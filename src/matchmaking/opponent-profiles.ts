import type { BotSkill } from "../controllers/bot-controller";
import type {
  ParticipantCount,
  ParticipantId
} from "../core/participants";
import { participantOrder } from "../core/participants";
import { createSeededRandom } from "../deck/random";
import { SAFE_OPPONENT_NICKNAME_COUNT, safeOpponentNickname } from "./opponent-nicknames";

export type OpponentSeatProfile = Readonly<{
  participantId: Exclude<ParticipantId, "human">;
  nickname: string;
  hiddenRating: number;
  skill: BotSkill;
}>;



export function botSkillForRating(rating: number): BotSkill {
  if (rating < 1200) return "easy";
  if (rating < 1750) return "normal";
  return "hard";
}

function clampRating(value: number): number {
  return Math.max(800, Math.min(2400, value));
}

export function createOpponentSeatProfiles(
  seed: number,
  participantCount: ParticipantCount,
  playerRating: number
): readonly OpponentSeatProfile[] {
  if (!Number.isFinite(playerRating)) {
    throw new Error("Invalid player rating");
  }

  const random = createSeededRandom((seed ^ 0xa511e9b3) >>> 0);
  const usedNameIndexes = new Set<number>();
  const ids = participantOrder(participantCount).slice(
    1
  ) as readonly Exclude<ParticipantId, "human">[];

  return ids.map((participantId) => {
    let nameIndex = Math.floor(
      random() * SAFE_OPPONENT_NICKNAME_COUNT
    );
    while (usedNameIndexes.has(nameIndex)) {
      nameIndex =
        (nameIndex + 1) % SAFE_OPPONENT_NICKNAME_COUNT;
    }
    usedNameIndexes.add(nameIndex);
    const nickname = safeOpponentNickname(nameIndex);
    const offset = Math.round(random() * 360 - 180);
    const hiddenRating = clampRating(
      Math.round(playerRating) + offset
    );

    return {
      participantId,
      nickname,
      hiddenRating,
      skill: botSkillForRating(hiddenRating)
    };
  });
}
