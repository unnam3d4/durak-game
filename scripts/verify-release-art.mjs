import { access, readFile, stat } from "node:fs/promises";
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
  ].map((name) => path.join(root, "backgrounds", name)),
  ...[
    "card.mp3",
    "take.mp3",
    "pass.mp3",
    "win.mp3",
    "loss.mp3",
    "timeout.mp3",
    "ui.mp3"
  ].map((name) => path.join(root, "audio", name))
];

const missing = [];
const invalid = [];

for (const file of required) {
  try {
    await access(file);
    const info = await stat(file);
    const header = await readFile(file);
    const extension = path.extname(file);
    const isWebp =
      extension === ".webp" &&
      header.length >= 12 &&
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP";
    const isMp3 =
      extension === ".mp3" &&
      header.length >= 3 &&
      (header.subarray(0, 3).toString("ascii") === "ID3" ||
        (header[0] === 0xff && (header[1] & 0xe0) === 0xe0));
    if (info.size === 0 || (!isWebp && !isMp3)) {
      invalid.push(path.relative(process.cwd(), file));
    }
  } catch {
    missing.push(path.relative(process.cwd(), file));
  }
}

if (missing.length > 0 || invalid.length > 0) {
  if (missing.length > 0) {
    console.error("Missing final release artwork:");
    for (const file of missing) console.error(`- ${file}`);
  }
  if (invalid.length > 0) {
    console.error("Invalid final release artwork:");
    for (const file of invalid) console.error(`- ${file}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Final release media verified: ${required.length} files`);
}
