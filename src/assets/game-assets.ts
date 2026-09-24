import type { Card } from "../core/cards";

const rankFile: Readonly<Record<Card["rank"], string>> = {
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A"
};

export function cardFaceAsset(card: Card): string {
  return `./assets/cards/${card.suit}/${rankFile[card.rank]}_${card.suit}.png`;
}

export const UI_ASSETS = {
  sound: "./assets/ui/icon_sound.png",
  settings: "./assets/ui/icon_settings.png",
  coins: "./assets/ui/icon_coins.png",
  rating: "./assets/ui/icon_rating.png",
  achievements: "./assets/ui/icon_achievements.png"
} as const;

export const BACKGROUND_ASSETS = {
  menuDesktop: "./assets/backgrounds/menu_desktop.png",
  menuMobile: "./assets/backgrounds/menu_mobile_1080x1920.png",
  victoryDesktop: "./assets/backgrounds/victory_desktop.png",
  victoryMobile: "./assets/backgrounds/victory_mobile_1080x1920.png",
  defeatDesktop: "./assets/backgrounds/defeat_desktop.png",
  defeatMobile: "./assets/backgrounds/defeat_mobile_1080x1920.png"
} as const;


const CARD_BACK_ASSETS: Readonly<Record<string, string>> = {
  back_emerald: "./assets/card-backs/emerald.png",
  back_crimson: "./assets/card-backs/crimson.png",
  back_midnight: "./assets/card-backs/midnight.png",
  back_green_felt: "./assets/card-backs/green_felt.png",
  back_graphite: "./assets/card-backs/graphite.png",
  back_burgundy: "./assets/card-backs/burgundy.png"
};

export function cardBackAsset(id: string): string {
  return CARD_BACK_ASSETS[id] ?? CARD_BACK_ASSETS.back_emerald;
}
