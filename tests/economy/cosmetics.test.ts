import { describe, expect, it } from "vitest";
import { equipCosmetic, purchaseCosmetic } from "../../src/economy/cosmetics";
import { createPlayerProfile } from "../../src/profile/player-profile";

describe("cosmetic economy", () => {
  it("starts with the default back and table equipped", () => {
    const profile = createPlayerProfile("Игрок_7", 1000);

    expect(profile.cosmetics.unlocked).toEqual([
      "back_emerald",
      "table_emerald"
    ]);
    expect(profile.cosmetics.equipped).toEqual({
      cardBack: "back_emerald",
      tableTheme: "table_emerald"
    });
  });

  it("buys a cosmetic with soft currency only", () => {
    const profile = {
      ...createPlayerProfile("Игрок_7", 1000),
      coins: 200
    };

    const purchase = purchaseCosmetic(profile, "back_crimson");
    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;

    expect(purchase.profile.coins).toBe(80);
    expect(purchase.profile.cosmetics.unlocked).toContain("back_crimson");
    expect(purchase.profile.cosmetics.equipped.cardBack).toBe("back_emerald");
  });

  it("does not allow a purchase without enough coins", () => {
    const profile = {
      ...createPlayerProfile("Игрок_7", 1000),
      coins: 50
    };

    expect(purchaseCosmetic(profile, "back_crimson")).toEqual({
      ok: false,
      reason: "insufficient-coins"
    });
  });

  it("equips only owned cosmetics in their own category", () => {
    let profile = {
      ...createPlayerProfile("Игрок_7", 1000),
      coins: 300
    };
    const purchase = purchaseCosmetic(profile, "table_graphite");
    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;
    profile = purchase.profile;

    const equipped = equipCosmetic(profile, "table_graphite");
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;

    expect(equipped.profile.cosmetics.equipped.tableTheme)
      .toBe("table_graphite");
    expect(equipped.profile.cosmetics.equipped.cardBack)
      .toBe("back_emerald");
  });

  it("rejects equipping a locked cosmetic", () => {
    const profile = createPlayerProfile("Игрок_7", 1000);

    expect(equipCosmetic(profile, "back_midnight")).toEqual({
      ok: false,
      reason: "not-owned"
    });
  });
});
