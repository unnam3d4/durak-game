import type { ParticipantId } from "../core/participants";
import { createSeededRandom } from "../deck/random";
import type { BotSkill } from "./bot-controller";

export type BotPersonality = Readonly<{
  skill: BotSkill;
  aggression: number;
  riskTolerance: number;
  trumpConservation: number;
  pressure: number;
  memoryUse: number;
  reactionSpeed: number;
  mistakeTendency: number;
  transferPreference: number;
  throwInPreference: number;
  tiltTendency: number;
  quitTendency: number;
}>;

type PersonalityBaseline = Omit<BotPersonality, "skill">;

const BASELINES: Readonly<Record<BotSkill, PersonalityBaseline>> = {
  easy: {
    aggression: 0.72,
    riskTolerance: 0.55,
    trumpConservation: 0.72,
    pressure: 0.75,
    memoryUse: 0,
    reactionSpeed: 0.66,
    mistakeTendency: 0.18,
    transferPreference: 0.62,
    throwInPreference: 0.72,
    tiltTendency: 0.16,
    quitTendency: 0.0012
  },
  normal: {
    aggression: 0.95,
    riskTolerance: 0.74,
    trumpConservation: 1,
    pressure: 1,
    memoryUse: 0.65,
    reactionSpeed: 0.72,
    mistakeTendency: 0.06,
    transferPreference: 0.9,
    throwInPreference: 0.95,
    tiltTendency: 0.09,
    quitTendency: 0.0007
  },
  hard: {
    aggression: 1.08,
    riskTolerance: 0.84,
    trumpConservation: 1.2,
    pressure: 1.2,
    memoryUse: 1,
    reactionSpeed: 0.78,
    mistakeTendency: 0,
    transferPreference: 1.08,
    throwInPreference: 1.08,
    tiltTendency: 0.04,
    quitTendency: 0.00035
  }
};

function clamp(value: number, minimum = 0, maximum = 1.5): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function personalitySeed(
  seed: number,
  participantId: ParticipantId,
  skill: BotSkill
): number {
  return (
    (seed >>> 0) ^
    hashText(participantId) ^
    Math.imul(hashText(skill), 0x9e3779b1)
  ) >>> 0;
}

function jitter(
  baseline: number,
  spread: number,
  random: () => number,
  minimum = 0,
  maximum = 1.5
): number {
  return clamp(
    baseline + (random() * 2 - 1) * spread,
    minimum,
    maximum
  );
}

export function createBotPersonality(
  seed: number,
  participantId: ParticipantId,
  skill: BotSkill
): BotPersonality {
  const base = BASELINES[skill];
  const random = createSeededRandom(
    personalitySeed(seed, participantId, skill)
  );

  return {
    skill,
    aggression: jitter(base.aggression, 0.12, random),
    riskTolerance: jitter(base.riskTolerance, 0.1, random),
    trumpConservation: jitter(base.trumpConservation, 0.1, random),
    pressure: jitter(base.pressure, 0.1, random),
    memoryUse:
      skill === "hard"
        ? 1
        : skill === "easy"
          ? 0
          : jitter(base.memoryUse, 0.12, random, 0, 1),
    reactionSpeed: jitter(base.reactionSpeed, 0.12, random, 0.25, 1),
    mistakeTendency:
      skill === "hard"
        ? 0
        : jitter(
            base.mistakeTendency,
            skill === "easy" ? 0.035 : 0.018,
            random,
            0,
            0.3
          ),
    transferPreference: jitter(
      base.transferPreference,
      0.12,
      random
    ),
    throwInPreference: jitter(
      base.throwInPreference,
      0.12,
      random
    ),
    tiltTendency: jitter(base.tiltTendency, 0.035, random, 0, 0.3),
    quitTendency: jitter(
      base.quitTendency,
      base.quitTendency * 0.35,
      random,
      0,
      0.0015
    )
  };
}

export function createBaselineBotPersonality(
  skill: BotSkill
): BotPersonality {
  return {
    skill,
    ...BASELINES[skill]
  };
}
