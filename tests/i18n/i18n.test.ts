import { describe, expect, it } from "vitest";
import {
  cardsLabel,
  hasCompleteEnglishDictionary,
  normalizeLanguage,
  placementLabel,
  playersLabel,
  rankLabel,
  selectedCardsLabel,
  t
} from "../../src/i18n/i18n";

describe("i18n", () => {
  it("normalizes Yandex language with RU/EN fallback", () => {
    expect(normalizeLanguage("ru")).toBe("ru");
    expect(normalizeLanguage("ru-RU")).toBe("ru");
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("de")).toBe("en");
    expect(normalizeLanguage("tr")).toBe("en");
    expect(normalizeLanguage(undefined)).toBe("en");
  });

  it("keeps every release key translated in English", () => {
    expect(hasCompleteEnglishDictionary()).toBe(true);
  });

  it("interpolates localized release copy", () => {
    expect(t("ru", "thinking", { name: "VIKTOR" })).toBe(
      "VIKTOR думает…"
    );
    expect(t("en", "thinking", { name: "VIKTOR" })).toBe(
      "VIKTOR is thinking…"
    );
  });

  it("localizes count, placement, selection, and rank helpers", () => {
    expect(cardsLabel("ru", 1)).toBe("1 карта");
    expect(cardsLabel("ru", 2)).toBe("2 карты");
    expect(cardsLabel("ru", 5)).toBe("5 карт");
    expect(cardsLabel("en", 2)).toBe("2 cards");
    expect(playersLabel("ru", 4)).toBe("4 игрока");
    expect(playersLabel("en", 4)).toBe("4 players");
    expect(placementLabel("ru", 2)).toBe("2 место");
    expect(placementLabel("en", 2)).toBe("2nd place");
    expect(selectedCardsLabel("en", "transfer", 2)).toBe(
      "Transfer: 2 cards"
    );
    expect(rankLabel("en", "grandmaster")).toBe("Grandmaster");
  });
});
