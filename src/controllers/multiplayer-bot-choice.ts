import type { RandomSource } from "../deck/random";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";
import type { BotPersonality } from "./multiplayer-bot-personality";

export type ScoredAction = Readonly<{
  action: MultiplayerGameAction;
  cost: number;
}>;

function toleranceFor(personality: BotPersonality): number {
  const base =
    personality.skill === "hard"
      ? 0.2
      : personality.skill === "normal"
        ? 0.6
        : 1.2;
  return base + personality.mistakeTendency * 0.8;
}

export function chooseScoredAction(
  candidates: readonly ScoredAction[],
  personality: BotPersonality,
  random: RandomSource
): MultiplayerGameAction {
  if (candidates.length === 0) {
    throw new Error("Cannot choose from an empty action list");
  }
  if (candidates.length === 1) return candidates[0]!.action;

  const ordered = [...candidates].sort((a, b) => a.cost - b.cost);
  const bestCost = ordered[0]!.cost;
  const tolerance = toleranceFor(personality);
  const plausible = ordered.filter(
    (candidate) =>
      Number.isFinite(candidate.cost) &&
      candidate.cost <= bestCost + tolerance
  );

  if (plausible.length <= 1) return ordered[0]!.action;

  const weights = plausible.map((candidate) => {
    const gap = Math.max(0, candidate.cost - bestCost);
    const qualityBias =
      personality.skill === "hard" ? 8 : personality.skill === "normal" ? 4 : 2;
    return 1 / (1 + gap * qualityBias);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.min(0.999999999, Math.max(0, random())) * total;

  for (let index = 0; index < plausible.length; index += 1) {
    cursor -= weights[index]!;
    if (cursor < 0) return plausible[index]!.action;
  }

  return plausible.at(-1)!.action;
}
