import { describe, expect, it } from "vitest";
import {
  AUDIO_ASSETS,
  BACKGROUND_ASSETS,
  RELEASE_IMAGE_ASSETS,
  UI_ASSETS,
  cardBackAsset,
  cardFaceAsset
} from "../../src/assets/game-assets";

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

  it("keeps every release image unique for idle preloading", () => {
    expect(RELEASE_IMAGE_ASSETS).toHaveLength(53);
    expect(new Set(RELEASE_IMAGE_ASSETS).size).toBe(53);
  });

  it("maps the polished game sound pack", () => {
    expect(AUDIO_ASSETS.card).toBe("./assets/audio/card.mp3");
    expect(AUDIO_ASSETS.take).toBe("./assets/audio/take.mp3");
    expect(AUDIO_ASSETS.win).toBe("./assets/audio/win.mp3");
    expect(AUDIO_ASSETS.timeout).toBe("./assets/audio/timeout.mp3");
  });
});
