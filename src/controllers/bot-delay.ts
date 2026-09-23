import type { RandomSource } from "../deck/random";

export type BotDelayInput = Readonly<{
  legalActionCount: number;
  complexity: number;
  reactionSpeed: number;
}>;

export const MAX_BOT_DELAY_MS = 15_000;
export const MIN_BOT_DELAY_MS = 300;

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
  const min = 300 + score * 2700;
  const max = 1200 + score * 13_800;
  const sampled = min + (max - min) * clamp01(random());
  const speedFactor = 1.15 - reactionSpeed * 0.5;

  return Math.min(
    MAX_BOT_DELAY_MS,
    Math.max(MIN_BOT_DELAY_MS, Math.round(sampled * speedFactor))
  );
}
