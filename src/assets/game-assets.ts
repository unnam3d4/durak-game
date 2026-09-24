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
  return `./assets/cards/${card.suit}/${rankFile[card.rank]}_${card.suit}.webp`;
}

export const UI_ASSETS = {
  sound: "./assets/ui/icon_sound.webp",
  settings: "./assets/ui/icon_settings.webp",
  coins: "./assets/ui/icon_coins.webp",
  rating: "./assets/ui/icon_rating.webp",
  achievements: "./assets/ui/icon_achievements.webp"
} as const;

export const AUDIO_ASSETS = {
  card: "./assets/audio/card.mp3",
  take: "./assets/audio/take.mp3",
  pass: "./assets/audio/pass.mp3",
  win: "./assets/audio/win.mp3",
  loss: "./assets/audio/loss.mp3",
  timeout: "./assets/audio/timeout.mp3",
  ui: "./assets/audio/ui.mp3"
} as const;

export const BACKGROUND_ASSETS = {
  menuDesktop: "./assets/backgrounds/menu_desktop.webp",
  menuMobile: "./assets/backgrounds/menu_mobile_1080x1920.webp",
  victoryDesktop: "./assets/backgrounds/victory_desktop.webp",
  victoryMobile: "./assets/backgrounds/victory_mobile_1080x1920.webp",
  defeatDesktop: "./assets/backgrounds/defeat_desktop.webp",
  defeatMobile: "./assets/backgrounds/defeat_mobile_1080x1920.webp"
} as const;


const CARD_BACK_ASSETS: Readonly<Record<string, string>> = {
  back_emerald: "./assets/card-backs/emerald.webp",
  back_crimson: "./assets/card-backs/crimson.webp",
  back_midnight: "./assets/card-backs/midnight.webp",
  back_green_felt: "./assets/card-backs/green_felt.webp",
  back_graphite: "./assets/card-backs/graphite.webp",
  back_burgundy: "./assets/card-backs/burgundy.webp"
};

export function cardBackAsset(id: string): string {
  return CARD_BACK_ASSETS[id] ?? CARD_BACK_ASSETS.back_emerald;
}
