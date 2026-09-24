import type { RandomSource } from "../deck/random";

export type BotDelayInput = Readonly<{
  legalActionCount: number;
  complexity: number;
  reactionSpeed: number;
}>;

export const MAX_BOT_DELAY_MS = 2_500;
export const MIN_BOT_DELAY_MS = 180;

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
    return context.participantCount === 2 ? 380 : 260;
  }

  if (context.phase === "taking") {
    return 240;
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
  const score = clamp01(complexity * 0.7 + ambiguity * 0.3);
  const min = 180 + score * 420;
  const max = 520 + score * 1_980;
  const sampled = min + (max - min) * clamp01(random());
  const speedFactor = 0.95 - reactionSpeed * 0.35;

  return Math.min(
    MAX_BOT_DELAY_MS,
    Math.max(MIN_BOT_DELAY_MS, Math.round(sampled * speedFactor))
  );
}
