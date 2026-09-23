export const RANKS = [
  { id: "10", label: "10-й разряд", min: 0 },
  { id: "9", label: "9-й разряд", min: 1100 },
  { id: "8", label: "8-й разряд", min: 1200 },
  { id: "7", label: "7-й разряд", min: 1300 },
  { id: "6", label: "6-й разряд", min: 1400 },
  { id: "5", label: "5-й разряд", min: 1500 },
  { id: "4", label: "4-й разряд", min: 1600 },
  { id: "3", label: "3-й разряд", min: 1700 },
  { id: "2", label: "2-й разряд", min: 1800 },
  { id: "1", label: "1-й разряд", min: 1900 },
  { id: "candidate", label: "Кандидат", min: 2050 },
  { id: "master", label: "Мастер", min: 2200 },
  { id: "grandmaster", label: "Гроссмейстер", min: 2400 }
] as const;

export type RankDefinition = (typeof RANKS)[number];
export type RankId = RankDefinition["id"];

const DEMOTION_BUFFER = 25;

export function levelForXp(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  return Math.max(1, Math.floor(Math.sqrt(safeXp / 100)) + 1);
}

function baseRankForRating(rating: number): RankDefinition {
  for (let index = RANKS.length - 1; index >= 0; index -= 1) {
    const rank = RANKS[index]!;
    if (rating >= rank.min) return rank;
  }
  return RANKS[0];
}

export function rankForRating(
  rating: number,
  previousRank?: RankId
): RankDefinition {
  const safeRating = Number.isFinite(rating)
    ? Math.max(0, rating)
    : 0;
  const baseline = baseRankForRating(safeRating);
  if (!previousRank) return baseline;

  const previous = RANKS.find((rank) => rank.id === previousRank);
  if (!previous) return baseline;

  if (baseline.min >= previous.min) {
    return baseline;
  }

  return safeRating >= previous.min - DEMOTION_BUFFER
    ? previous
    : baseline;
}
