export type AchievementDefinition = Readonly<{
  id: string;
  title: string;
  description: string;
}>;

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "first_match",
    title: "Первый стол",
    description: "Завершить первую партию."
  },
  {
    id: "first_win",
    title: "Не дурак",
    description: "Одержать первую победу."
  },
  {
    id: "streak_3",
    title: "На ходу",
    description: "Выиграть 3 партии подряд."
  },
  {
    id: "streak_5",
    title: "Горячая рука",
    description: "Выиграть 5 партий подряд."
  },
  {
    id: "streak_10",
    title: "Без остановки",
    description: "Выиграть 10 партий подряд."
  },
  {
    id: "matches_10",
    title: "Завсегдатай",
    description: "Завершить 10 партий."
  }
] as const;
