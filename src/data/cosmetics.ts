export type CosmeticCategory = "cardBack" | "tableTheme";

export type CosmeticDefinition = Readonly<{
  id: string;
  category: CosmeticCategory;
  title: string;
  description: string;
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
    title: "Изумруд",
    description: "Классическая зелёная рубашка.",
    price: 0
  },
  {
    id: "back_crimson",
    category: "cardBack",
    title: "Багрянец",
    description: "Тёплая красная рубашка с золотым кантом.",
    price: 120
  },
  {
    id: "back_midnight",
    category: "cardBack",
    title: "Полночь",
    description: "Глубокая синяя рубашка для строгого стола.",
    price: 220
  },
  {
    id: "table_emerald",
    category: "tableTheme",
    title: "Зелёное сукно",
    description: "Классический карточный стол.",
    price: 0
  },
  {
    id: "table_graphite",
    category: "tableTheme",
    title: "Графит",
    description: "Холодный тёмный стол без лишнего блеска.",
    price: 180
  },
  {
    id: "table_burgundy",
    category: "tableTheme",
    title: "Бордо",
    description: "Тёмное бордовое сукно с клубным характером.",
    price: 280
  }
] as const;

const DEFAULT_UNLOCKED = ["back_emerald", "table_emerald"] as const;

export function cosmeticById(
  id: string
): CosmeticDefinition | undefined {
  return COSMETIC_CATALOG.find((cosmetic) => cosmetic.id === id);
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
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidCosmeticInventory(
  value: unknown
): value is CosmeticInventory {
  if (!isRecord(value) || !Array.isArray(value.unlocked)) {
    return false;
  }
  if (
    !value.unlocked.every((id) => typeof id === "string") ||
    new Set(value.unlocked).size !== value.unlocked.length ||
    !DEFAULT_UNLOCKED.every((id) => value.unlocked.includes(id))
  ) {
    return false;
  }

  const knownIds = new Set(COSMETIC_CATALOG.map((cosmetic) => cosmetic.id));
  if (!value.unlocked.every((id) => knownIds.has(id))) {
    return false;
  }

  if (!isRecord(value.equipped)) return false;
  const cardBack = value.equipped.cardBack;
  const tableTheme = value.equipped.tableTheme;
  if (typeof cardBack !== "string" || typeof tableTheme !== "string") {
    return false;
  }
  if (
    !value.unlocked.includes(cardBack) ||
    !value.unlocked.includes(tableTheme)
  ) {
    return false;
  }

  return (
    cosmeticById(cardBack)?.category === "cardBack" &&
    cosmeticById(tableTheme)?.category === "tableTheme"
  );
}
