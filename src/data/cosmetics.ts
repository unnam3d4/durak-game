export type CosmeticCategory =
  | "cardBack"
  | "tableTheme"
  | "nameplate";

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
  },
  {
    id: "nameplate_classic",
    category: "nameplate",
    title: { ru: "Классика", en: "Classic" },
    description: {
      ru: "Чистое имя без декоративной рамки.",
      en: "Clean table name without a decorative frame."
    },
    price: 0
  },
  {
    id: "nameplate_gold",
    category: "nameplate",
    title: { ru: "Золотой кант", en: "Gold Trim" },
    description: {
      ru: "Тёплая золотая рамка для имени за столом.",
      en: "Warm gold trim for your table name."
    },
    price: 160
  },
  {
    id: "nameplate_emerald",
    category: "nameplate",
    title: { ru: "Изумрудная рамка", en: "Emerald Frame" },
    description: {
      ru: "Изумрудный акцент с мягким свечением.",
      en: "Emerald accent with a restrained glow."
    },
    price: 190
  },
  {
    id: "nameplate_burgundy",
    category: "nameplate",
    title: { ru: "Бордовая рамка", en: "Burgundy Frame" },
    description: {
      ru: "Глубокий бордовый акцент с золотой кромкой.",
      en: "Deep burgundy accent with a gold edge."
    },
    price: 240
  }
] as const;

const REQUIRED_LEGACY_DEFAULTS = [
  "back_emerald",
  "table_emerald"
] as const;

const DEFAULT_NAMEPLATE = "nameplate_classic";

const DEFAULT_UNLOCKED = [
  ...REQUIRED_LEGACY_DEFAULTS,
  DEFAULT_NAMEPLATE
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
      tableTheme: "table_emerald",
      nameplate: DEFAULT_NAMEPLATE
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeCosmeticInventory(
  value: unknown
): CosmeticInventory | null {
  if (!isRecord(value) || !Array.isArray(value.unlocked)) {
    return null;
  }

  if (
    !value.unlocked.every((id) => typeof id === "string") ||
    new Set(value.unlocked).size !== value.unlocked.length ||
    !REQUIRED_LEGACY_DEFAULTS.every((id) =>
      value.unlocked.includes(id)
    )
  ) {
    return null;
  }

  const known = new Set(COSMETIC_CATALOG.map((item) => item.id));
  if (!value.unlocked.every((id) => known.has(id as string))) {
    return null;
  }

  if (!isRecord(value.equipped)) return null;

  const cardBack = value.equipped.cardBack;
  const tableTheme = value.equipped.tableTheme;
  const nameplate =
    typeof value.equipped.nameplate === "string"
      ? value.equipped.nameplate
      : DEFAULT_NAMEPLATE;

  if (
    typeof cardBack !== "string" ||
    typeof tableTheme !== "string"
  ) {
    return null;
  }

  const unlocked = [...value.unlocked];
  if (!unlocked.includes(DEFAULT_NAMEPLATE)) {
    unlocked.push(DEFAULT_NAMEPLATE);
  }

  if (
    !unlocked.includes(cardBack) ||
    !unlocked.includes(tableTheme) ||
    !unlocked.includes(nameplate)
  ) {
    return null;
  }

  if (
    cosmeticById(cardBack)?.category !== "cardBack" ||
    cosmeticById(tableTheme)?.category !== "tableTheme" ||
    cosmeticById(nameplate)?.category !== "nameplate"
  ) {
    return null;
  }

  return {
    unlocked,
    equipped: {
      cardBack,
      tableTheme,
      nameplate
    }
  };
}

export function isValidCosmeticInventory(
  value: unknown
): value is CosmeticInventory {
  return sanitizeCosmeticInventory(value) !== null;
}
