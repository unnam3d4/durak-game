import { describe, expect, it } from "vitest";
import { cardBackAsset, cardFaceAsset, UI_ASSETS, BACKGROUND_ASSETS } from "../../src/assets/game-assets";

describe("final game asset contract", () => {
  it("maps every card face to the approved asset tree", () => {
    expect(
      cardFaceAsset({ id: "hearts-12", suit: "hearts", rank: 12 })
    ).toBe("./assets/cards/hearts/Q_hearts.webp");
    expect(
      cardFaceAsset({ id: "spades-14", suit: "spades", rank: 14 })
    ).toBe("./assets/cards/spades/A_spades.webp");
  });

  it("maps all six approved card backs", () => {
    expect(cardBackAsset("back_emerald")).toContain("emerald.webp");
    expect(cardBackAsset("back_crimson")).toContain("crimson.webp");
    expect(cardBackAsset("back_midnight")).toContain("midnight.webp");
    expect(cardBackAsset("back_green_felt")).toContain("green_felt.webp");
    expect(cardBackAsset("back_graphite")).toContain("graphite.webp");
    expect(cardBackAsset("back_burgundy")).toContain("burgundy.webp");
  });

  it("keeps UI and responsive result artwork paths stable", () => {
    expect(UI_ASSETS.sound).toContain("icon_sound.webp");
    expect(UI_ASSETS.coins).toContain("icon_coins.webp");
    expect(BACKGROUND_ASSETS.menuMobile).toContain("menu_mobile_1080x1920.webp");
    expect(BACKGROUND_ASSETS.victoryDesktop).toContain("victory_desktop.webp");
    expect(BACKGROUND_ASSETS.defeatDesktop).toContain("defeat_desktop.webp");
  });
});
