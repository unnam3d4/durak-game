import type { Card } from "../core/cards";
import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import type { RankId } from "../profile/progression";
import {
  enMessages,
  messages,
  type MessageKey
} from "./messages";

export type Language = keyof typeof messages;
export type MessageParams = Readonly<
  Record<string, string | number>
>;

export function normalizeLanguage(
  value: string | null | undefined
): Language {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "ru" || normalized.startsWith("ru-")) {
    return "ru";
  }
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  return "en";
}

export function t(
  lang: Language,
  key: MessageKey,
  params: MessageParams = {}
): string {
  let text = messages[lang][key];
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function variantLabel(
  lang: Language,
  variant: MultiplayerVariant
): string {
  return t(
    lang,
    variant === "perevodnoy"
      ? "variantPerevodnoy"
      : "variantPodkidnoy"
  );
}

export function playersLabel(
  lang: Language,
  count: number
): string {
  if (lang === "en") {
    return `${count} ${count === 1 ? "player" : "players"}`;
  }

  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "игрок"
      : [2, 3, 4].includes(mod10) &&
          ![12, 13, 14].includes(mod100)
        ? "игрока"
        : "игроков";
  return `${count} ${word}`;
}

export function cardsLabel(
  lang: Language,
  count: number
): string {
  if (lang === "en") {
    return `${count} ${count === 1 ? "card" : "cards"}`;
  }

  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "карта"
      : [2, 3, 4].includes(mod10) &&
          ![12, 13, 14].includes(mod100)
        ? "карты"
        : "карт";
  return `${count} ${word}`;
}

export function selectedCardsLabel(
  lang: Language,
  kind: "move" | "transfer",
  count: number
): string {
  if (lang === "en") {
    return `${kind === "transfer" ? "Transfer" : "Play"}: ${cardsLabel(
      lang,
      count
    )}`;
  }

  return `${kind === "transfer" ? "Перевести" : "Ход"}: ${cardsLabel(
    lang,
    count
  )}`;
}

export function placementLabel(
  lang: Language,
  placement: number
): string {
  if (lang === "en") {
    const mod100 = placement % 100;
    const mod10 = placement % 10;
    const suffix =
      mod100 >= 11 && mod100 <= 13
        ? "th"
        : mod10 === 1
          ? "st"
          : mod10 === 2
            ? "nd"
            : mod10 === 3
              ? "rd"
              : "th";
    return `${placement}${suffix} place`;
  }
  return `${placement} место`;
}

const rankKeys: Readonly<Record<RankId, MessageKey>> = {
  "10": "rank10",
  "9": "rank9",
  "8": "rank8",
  "7": "rank7",
  "6": "rank6",
  "5": "rank5",
  "4": "rank4",
  "3": "rank3",
  "2": "rank2",
  "1": "rank1",
  candidate: "rankCandidate",
  master: "rankMaster",
  grandmaster: "rankGrandmaster"
};

export function rankLabel(
  lang: Language,
  rankId: RankId
): string {
  return t(lang, rankKeys[rankId]);
}

export function localizeStoredRankLabel(
  lang: Language,
  storedLabel: string
): string {
  if (lang === "ru") return storedLabel;

  const key = (Object.keys(rankKeys) as RankId[]).find(
    (rankId) =>
      messages.ru[rankKeys[rankId]] === storedLabel
  );
  return key ? rankLabel(lang, key) : storedLabel;
}

export function cardRankLabel(
  lang: Language,
  rank: Card["rank"]
): string {
  if (rank <= 10) return String(rank);
  if (lang === "en") {
    if (rank === 11) return "J";
    if (rank === 12) return "Q";
    if (rank === 13) return "K";
    return "A";
  }
  if (rank === 11) return "В";
  if (rank === 12) return "Д";
  if (rank === 13) return "К";
  return "Т";
}

export function suitName(
  lang: Language,
  suit: Card["suit"]
): string {
  const key: MessageKey =
    suit === "clubs"
      ? "suitClubs"
      : suit === "diamonds"
        ? "suitDiamonds"
        : suit === "hearts"
          ? "suitHearts"
          : "suitSpades";
  return t(lang, key);
}

export function hasCompleteEnglishDictionary(): boolean {
  return Object.keys(messages.ru).every(
    (key) =>
      typeof enMessages[key as MessageKey] === "string" &&
      enMessages[key as MessageKey].length > 0
  );
}
