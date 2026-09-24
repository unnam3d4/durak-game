export type AchievementDefinition = Readonly<{
  id: string;
  title: Readonly<{ ru: string; en: string }>;
  description: Readonly<{ ru: string; en: string }>;
}>;

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "first_match",
    title: { ru: "Первый стол", en: "First Table" },
    description: {
      ru: "Завершить первую рейтинговую партию.",
      en: "Finish your first ranked match."
    }
  },
  {
    id: "first_win",
    title: { ru: "Не дурак", en: "Not the Durak" },
    description: {
      ru: "Одержать первую победу.",
      en: "Win your first match."
    }
  },
  {
    id: "streak_3",
    title: { ru: "На ходу", en: "On a Roll" },
    description: {
      ru: "Выиграть 3 партии подряд.",
      en: "Win 3 matches in a row."
    }
  },
  {
    id: "streak_5",
    title: { ru: "Горячая рука", en: "Hot Hand" },
    description: {
      ru: "Выиграть 5 партий подряд.",
      en: "Win 5 matches in a row."
    }
  },
  {
    id: "streak_10",
    title: { ru: "Без остановки", en: "Unstoppable" },
    description: {
      ru: "Выиграть 10 партий подряд.",
      en: "Win 10 matches in a row."
    }
  },
  {
    id: "matches_10",
    title: { ru: "Завсегдатай", en: "Regular" },
    description: {
      ru: "Завершить 10 рейтинговых партий.",
      en: "Finish 10 ranked matches."
    }
  },
  {
    id: "perevodnoy_win",
    title: { ru: "Переводчик", en: "Translator" },
    description: {
      ru: "Победить в переводном Дураке.",
      en: "Win a Perevodnoy Durak match."
    }
  },
  {
    id: "four_player_win",
    title: { ru: "Полный стол", en: "Full Table" },
    description: {
      ru: "Победить за столом на 4 игроков.",
      en: "Win a 4-player match."
    }
  }
] as const;
