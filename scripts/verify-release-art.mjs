import { access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("public", "assets");
const suits = ["hearts", "diamonds", "spades", "clubs"];
const ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const required = [
  ...suits.flatMap((suit) =>
    ranks.map((rank) =>
      path.join(root, "cards", suit, `${rank}_${suit}.png`)
    )
  ),
  ...[
    "emerald.png",
    "crimson.png",
    "midnight.png",
    "green_felt.png",
    "graphite.png",
    "burgundy.png"
  ].map((name) => path.join(root, "card-backs", name)),
  ...[
    "icon_sound.png",
    "icon_settings.png",
    "icon_coins.png",
    "icon_rating.png",
    "icon_achievements.png"
  ].map((name) => path.join(root, "ui", name)),
  ...[
    "menu_desktop.png",
    "menu_mobile_1080x1920.png",
    "victory_desktop.png",
    "victory_mobile_1080x1920.png",
    "defeat_desktop.png",
    "defeat_mobile_1080x1920.png"
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
