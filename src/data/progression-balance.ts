export const PROGRESSION_BALANCE = {
  xpPerLevel: 100,
  xpMatchComplete: 20,
  xpWinBonus: 20,
  xpDrawBonus: 5,
  xpStreakMilestoneBonus: 15,
  coinsMatchComplete: 10,
  coinsWinBonus: 15,
  coinsDrawBonus: 5,
  coinsStreakMilestoneBonus: 10,
  ratingWin: 25,
  ratingLoss: -20,
  ratingDraw: 0,
  streakMilestones: [3, 5, 10] as const
} as const;

export const RANK_TIERS = [
  { minRating: 1000, label: "Мастер" },
  { minRating: 900, label: "1 разряд" },
  { minRating: 800, label: "2 разряд" },
  { minRating: 700, label: "3 разряд" },
  { minRating: 600, label: "4 разряд" },
  { minRating: 500, label: "5 разряд" },
  { minRating: 400, label: "6 разряд" },
  { minRating: 300, label: "7 разряд" },
  { minRating: 200, label: "8 разряд" },
  { minRating: 100, label: "9 разряд" },
  { minRating: 0, label: "10 разряд" }
] as const;

export type RankLabel = (typeof RANK_TIERS)[number]["label"];
