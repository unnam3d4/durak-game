import type { BotSkill } from "../controllers/bot-controller";
import type {
  ParticipantCount,
  ParticipantId
} from "../core/participants";
import { participantOrder } from "../core/participants";
import { createSeededRandom } from "../deck/random";
import {
  OPPONENT_NICKNAME_STYLE_COUNT,
  SAFE_OPPONENT_NICKNAME_COUNT,
  safeOpponentNickname
} from "./opponent-nicknames";

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
  const namesPerStyle =
    SAFE_OPPONENT_NICKNAME_COUNT / OPPONENT_NICKNAME_STYLE_COUNT;
  const startingStyle = Math.floor(
    random() * OPPONENT_NICKNAME_STYLE_COUNT
  );

  return ids.map((participantId, seatIndex) => {
    const style =
      (startingStyle + seatIndex * 3) %
      OPPONENT_NICKNAME_STYLE_COUNT;
    let localIndex = Math.floor(random() * namesPerStyle);
    let nameIndex =
      style + localIndex * OPPONENT_NICKNAME_STYLE_COUNT;
    while (usedNameIndexes.has(nameIndex)) {
      localIndex = (localIndex + 1) % namesPerStyle;
      nameIndex =
        style + localIndex * OPPONENT_NICKNAME_STYLE_COUNT;
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
