import { describe, expect, it } from "vitest";
import { createDefaultPlayerMeta } from "../../src/meta/player-meta";
import {
  equipCosmetic,
  purchaseCosmetic
} from "../../src/economy/cosmetics";

describe("cosmetic economy", () => {
  it("starts with a free back and table theme", () => {
    const meta = createDefaultPlayerMeta();

    expect(meta.cosmetics.unlocked).toEqual([
      "back_emerald",
      "table_emerald"
    ]);
  });

  it("buys cosmetics with soft currency and never wagers it", () => {
    const meta = {
      ...createDefaultPlayerMeta(),
      coins: 200
    };

    const result = purchaseCosmetic(meta, "back_crimson", 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.meta.coins).toBe(80);
    expect(result.meta.cosmetics.unlocked).toContain("back_crimson");
    expect(result.meta.cosmetics.equipped.cardBack)
      .toBe("back_emerald");
  });

  it("equips only unlocked cosmetics", () => {
    const meta = createDefaultPlayerMeta();

    expect(equipCosmetic(meta, "back_midnight")).toEqual({
      ok: false,
      reason: "not-owned"
    });
  });
});
