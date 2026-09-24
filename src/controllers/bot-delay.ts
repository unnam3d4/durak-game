import type { RandomSource } from "../deck/random";

export type BotDelayInput = Readonly<{
  legalActionCount: number;
  complexity: number;
  reactionSpeed: number;
}>;

export const MAX_BOT_DELAY_MS = 7_000;
export const MIN_BOT_DELAY_MS = 1_600;

export type BotPacingContext = Readonly<{
  phase: "attack" | "defend" | "throw-in" | "taking";
  participantCount: number;
  tableCardCount: number;
  uncoveredAttackCount: number;
}>;

export function botReadabilityFloorMs(
  context: BotPacingContext
): number {
  if (
    context.phase === "throw-in" &&
    context.tableCardCount > 0 &&
    context.uncoveredAttackCount === 0
  ) {
    return context.participantCount === 2 ? 2_100 : 1_800;
  }

  if (context.phase === "taking") {
    return 1_900;
  }

  if (context.phase === "defend" && context.uncoveredAttackCount > 0) {
    return 1_850;
  }

  return MIN_BOT_DELAY_MS;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function computeBotDelayMs(
  input: BotDelayInput,
  random: RandomSource
): number {
  const ambiguity = clamp01((input.legalActionCount - 1) / 8);
  const complexity = clamp01(input.complexity);
  const reactionSpeed = clamp01(input.reactionSpeed);
  const score = clamp01(complexity * 0.65 + ambiguity * 0.35);

  // Every turn samples a fresh continuous range. There are no fixed
  // "2 sec / 3 sec / 5 sec" presets, so consecutive bot turns do not
  // fall into an obviously scripted cadence.
  const min = 1_800 + score * 1_200;
  const max = 5_200 + score * 2_600;
  const sampled = min + (max - min) * clamp01(random());
  const personalityFactor = 1.08 - reactionSpeed * 0.12;

  return Math.min(
    MAX_BOT_DELAY_MS,
    Math.max(
      MIN_BOT_DELAY_MS,
      Math.round(sampled * personalityFactor)
    )
  );
}
