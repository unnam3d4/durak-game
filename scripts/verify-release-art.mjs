import { access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("public", "assets");
const suits = ["hearts", "diamonds", "spades", "clubs"];
const ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const required = [
  ...suits.flatMap((suit) =>
    ranks.map((rank) =>
      path.join(root, "cards", suit, `${rank}_${suit}.webp`)
    )
  ),
  ...[
    "emerald.webp",
    "crimson.webp",
    "midnight.webp",
    "green_felt.webp",
    "graphite.webp",
    "burgundy.webp"
  ].map((name) => path.join(root, "card-backs", name)),
  ...[
    "icon_sound.webp",
    "icon_settings.webp",
    "icon_coins.webp",
    "icon_rating.webp",
    "icon_achievements.webp"
  ].map((name) => path.join(root, "ui", name)),
  ...[
    "menu_desktop.webp",
    "menu_mobile_1080x1920.webp",
    "victory_desktop.webp",
    "victory_mobile_1080x1920.webp",
    "defeat_desktop.webp",
    "defeat_mobile_1080x1920.webp"
  ].map((name) => path.join(root, "backgrounds", name))
];

const missing = [];
for (const file of required) {
  try {
    await access(file);
  } catch {
    missing.push(path.relative(process.cwd(), file));
  }
}

if (missing.length > 0) {
  console.error("Missing final release artwork:");
  for (const file of missing) console.error(`- ${file}`);
  process.exitCode = 1;
} else {
  console.log(`Final release artwork verified: ${required.length} files`);
}
