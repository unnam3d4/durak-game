export type CosmeticCategory = "cardBack" | "tableTheme";

export type CosmeticDefinition = Readonly<{
  id: string;
  category: CosmeticCategory;
  title: Readonly<{ ru: string; en: string }>;
  description: Readonly<{ ru: string; en: string }>;
  price: number;
}>;

export type CosmeticInventory = Readonly<{
  unlocked: readonly string[];
  equipped: Readonly<Record<CosmeticCategory, string>>;
}>;

export const COSMETIC_CATALOG: readonly CosmeticDefinition[] = [
  {
    id: "back_emerald",
    category: "cardBack",
    title: { ru: "Изумруд", en: "Emerald" },
    description: {
      ru: "Классическая зелёная рубашка.",
      en: "Classic green card back."
    },
    price: 0
  },
  {
    id: "back_crimson",
    category: "cardBack",
    title: { ru: "Багрянец", en: "Crimson" },
    description: {
      ru: "Тёплая красная рубашка с золотым кантом.",
      en: "Warm red card back with a gold edge."
    },
    price: 120
  },
  {
    id: "back_midnight",
    category: "cardBack",
    title: { ru: "Полночь", en: "Midnight" },
    description: {
      ru: "Глубокая синяя рубашка для строгого стола.",
      en: "Deep blue card back for a restrained table."
    },
    price: 220
  },
  {
    id: "back_green_felt",
    category: "cardBack",
    title: { ru: "Зелёное сукно", en: "Green Felt" },
    description: {
      ru: "Стёганая изумрудная рубашка с золотым орнаментом.",
      en: "Quilted emerald card back with gold ornament."
    },
    price: 160
  },
  {
    id: "back_graphite",
    category: "cardBack",
    title: { ru: "Графит", en: "Graphite" },
    description: {
      ru: "Тёмная графитовая рубашка с холодным золотом.",
      en: "Dark graphite card back with restrained gold."
    },
    price: 180
  },
  {
    id: "back_burgundy",
    category: "cardBack",
    title: { ru: "Бордо", en: "Burgundy" },
    description: {
      ru: "Глубокая бордовая рубашка с рубиновым акцентом.",
      en: "Deep burgundy card back with a ruby accent."
    },
    price: 280
  },
  {
    id: "table_emerald",
    category: "tableTheme",
    title: { ru: "Стол — Зелёное сукно", en: "Table — Green Felt" },
    description: {
      ru: "Классический карточный стол.",
      en: "Classic card table."
    },
    price: 0
  },
  {
    id: "table_graphite",
    category: "tableTheme",
    title: { ru: "Стол — Графит", en: "Table — Graphite" },
    description: {
      ru: "Холодный тёмный стол без лишнего блеска.",
      en: "Cool dark table with restrained highlights."
    },
    price: 180
  },
  {
    id: "table_burgundy",
    category: "tableTheme",
    title: { ru: "Стол — Бордо", en: "Table — Burgundy" },
    description: {
      ru: "Тёмное бордовое сукно с клубным характером.",
      en: "Dark burgundy felt with a club-like character."
    },
    price: 280
  }
] as const;

const DEFAULT_UNLOCKED = [
  "back_emerald",
  "table_emerald"
] as const;

export function cosmeticById(
  id: string
): CosmeticDefinition | undefined {
  return COSMETIC_CATALOG.find((item) => item.id === id);
}

export function createDefaultCosmeticInventory(): CosmeticInventory {
  return {
    unlocked: [...DEFAULT_UNLOCKED],
    equipped: {
      cardBack: "back_emerald",
      tableTheme: "table_emerald"
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isValidCosmeticInventory(
  value: unknown
): value is CosmeticInventory {
  if (!isRecord(value) || !Array.isArray(value.unlocked)) {
    return false;
  }

  const unlocked = value.unlocked;
  if (
    !unlocked.every((id) => typeof id === "string") ||
    new Set(unlocked).size !== unlocked.length ||
    !DEFAULT_UNLOCKED.every((id) => unlocked.includes(id))
  ) {
    return false;
  }

  const known = new Set(COSMETIC_CATALOG.map((item) => item.id));
  if (!unlocked.every((id) => known.has(id as string))) return false;

  if (!isRecord(value.equipped)) return false;
  const cardBack = value.equipped.cardBack;
  const tableTheme = value.equipped.tableTheme;

  if (
    typeof cardBack !== "string" ||
    typeof tableTheme !== "string" ||
    !unlocked.includes(cardBack) ||
    !unlocked.includes(tableTheme)
  ) {
    return false;
  }

  return (
    cosmeticById(cardBack)?.category === "cardBack" &&
    cosmeticById(tableTheme)?.category === "tableTheme"
  );
}
