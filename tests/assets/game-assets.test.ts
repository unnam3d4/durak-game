import { describe, expect, it } from "vitest";
import { cardBackAsset, cardFaceAsset, UI_ASSETS, BACKGROUND_ASSETS } from "../../src/assets/game-assets";

describe("final game asset contract", () => {
  it("maps every card face to the approved asset tree", () => {
    expect(
      cardFaceAsset({ id: "hearts-12", suit: "hearts", rank: 12 })
    ).toBe("./assets/cards/hearts/Q_hearts.png");
    expect(
      cardFaceAsset({ id: "spades-14", suit: "spades", rank: 14 })
    ).toBe("./assets/cards/spades/A_spades.png");
  });

  it("maps all six approved card backs", () => {
    expect(cardBackAsset("back_emerald")).toContain("emerald.png");
    expect(cardBackAsset("back_crimson")).toContain("crimson.png");
    expect(cardBackAsset("back_midnight")).toContain("midnight.png");
    expect(cardBackAsset("back_green_felt")).toContain("green_felt.png");
    expect(cardBackAsset("back_graphite")).toContain("graphite.png");
    expect(cardBackAsset("back_burgundy")).toContain("burgundy.png");
  });

  it("keeps UI and responsive result artwork paths stable", () => {
    expect(UI_ASSETS.sound).toContain("icon_sound.png");
    expect(UI_ASSETS.coins).toContain("icon_coins.png");
    expect(BACKGROUND_ASSETS.menuMobile).toContain("menu_mobile_1080x1920.png");
    expect(BACKGROUND_ASSETS.victoryDesktop).toContain("victory_desktop.png");
    expect(BACKGROUND_ASSETS.defeatDesktop).toContain("defeat_desktop.png");
  });
});
