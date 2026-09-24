import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import {
  createDefaultCosmeticInventory,
  type CosmeticInventory
} from "../data/cosmetics";

export type MatchStatsBucket = Readonly<{
  played: number;
  wins: number;
  losses: number;
}>;

export type PlayerMetaStats = Readonly<{
  matchesPlayed: number;
  wins: number;
  losses: number;
  technicalLosses: number;
  surrenders: number;
  currentStreak: number;
  bestStreak: number;
  byVariant: Readonly<Record<MultiplayerVariant, MatchStatsBucket>>;
  byParticipants: Readonly<
    Record<"2" | "3" | "4", MatchStatsBucket>
  >;
}>;

export type DailyRewardState = Readonly<{
  lastClaimUtcDay: string | null;
  streak: number;
}>;

export type PlayerMetaV1 = Readonly<{
  schemaVersion: 1;
  coins: number;
  stats: PlayerMetaStats;
  achievements: readonly string[];
  cosmetics: CosmeticInventory;
  dailyReward: DailyRewardState;
  updatedAtMs: number;
}>;

function emptyBucket(): MatchStatsBucket {
  return { played: 0, wins: 0, losses: 0 };
}

export function createEmptyMetaStats(): PlayerMetaStats {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    technicalLosses: 0,
    surrenders: 0,
    currentStreak: 0,
    bestStreak: 0,
    byVariant: {
      podkidnoy: emptyBucket(),
      perevodnoy: emptyBucket()
    },
    byParticipants: {
      "2": emptyBucket(),
      "3": emptyBucket(),
      "4": emptyBucket()
    }
  };
}

export function createDefaultPlayerMeta(
  updatedAtMs = 0
): PlayerMetaV1 {
  return {
    schemaVersion: 1,
    coins: 0,
    stats: createEmptyMetaStats(),
    achievements: [],
    cosmetics: createDefaultCosmeticInventory(),
    dailyReward: {
      lastClaimUtcDay: null,
      streak: 0
    },
    updatedAtMs
  };
}
