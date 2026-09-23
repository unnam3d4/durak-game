import type { BotSkill } from "../controllers/bot-controller";
import type {
  ParticipantCount,
  ParticipantId
} from "../core/participants";
import { participantOrder } from "../core/participants";
import { createSeededRandom } from "../deck/random";

export type OpponentSeatProfile = Readonly<{
  participantId: Exclude<ParticipantId, "human">;
  nickname: string;
  hiddenRating: number;
  skill: BotSkill;
}>;

const NICKNAMES = [
  "VIKTOR",
  "Maks77",
  "Димон",
  "Artem",
  "ROMA",
  "kot_88",
  "Serega",
  "Nikita",
  "VOLK",
  "Den4ik",
  "Макс",
  "Илья",
  "Andrey",
  "Slava",
  "Kirill",
  "Лис",
  "Vadim",
  "Alex_7",
  "Саня",
  "Timur",
  "Misha",
  "Егор",
  "Ruslan",
  "Stas",
  "Anton",
  "Денис",
  "Igor",
  "Рома_23",
  "Vlad",
  "Gleb"
] as const;

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
  const availableNames = [...NICKNAMES];
  const ids = participantOrder(participantCount).slice(
    1
  ) as readonly Exclude<ParticipantId, "human">[];

  return ids.map((participantId) => {
    const nameIndex = Math.min(
      availableNames.length - 1,
      Math.floor(random() * availableNames.length)
    );
    const nickname = availableNames.splice(nameIndex, 1)[0]!;
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
