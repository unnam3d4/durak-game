import type { RandomSource } from "../deck/random";

export type BotDelayInput = Readonly<{
  legalActionCount: number;
  complexity: number;
}>;

export const MAX_BOT_DELAY_MS = 15_000;

export function computeBotDelayMs(
  input: BotDelayInput,
  random: RandomSource
): number {
  const ambiguity = Math.min(1, Math.max(0, (input.legalActionCount - 1) / 8));
  const complexity = Math.min(1, Math.max(0, input.complexity));
  const score = Math.min(1, Math.max(0, complexity * 0.7 + ambiguity * 0.3));
  const min = 300 + score * 2700;
  const max = 1200 + score * 13_800;
  return Math.min(MAX_BOT_DELAY_MS, Math.round(min + (max - min) * random()));
}
