import { createContext, useContext } from "react";
import type { PlayerProfileV1 } from "../profile/player-profile";
import type { KeyValueStorage } from "../save/storage";

export type LeaderboardEntryView = Readonly<{
  rank: number;
  score: number;
  publicName: string;
}>;

export type LeaderboardSnapshot = Readonly<{
  entries: readonly LeaderboardEntryView[];
  userRank: number | null;
}>;

export type GamePlatform = Readonly<{
  kind: "yandex" | "standalone";
  lang: string;
  storage: KeyValueStorage;
  isAuthorized: () => boolean;
  loadingReady: () => void;
  gameplayStart: () => void;
  gameplayStop: () => void;
  authorize: () => Promise<boolean>;
  saveCloudProfile: (profile: PlayerProfileV1) => Promise<void>;
  loadCloudProfile: () => Promise<PlayerProfileV1 | null>;
  setLeaderboardScore: (score: number) => Promise<void>;
  getLeaderboard: () => Promise<LeaderboardSnapshot | null>;
  showInterstitial: () => Promise<void>;
  onPlatformPause: (listener: () => void) => () => void;
  onPlatformResume: (listener: () => void) => () => void;
}>;

export const GamePlatformContext =
  createContext<GamePlatform | null>(null);

export function useGamePlatform(): GamePlatform {
  const platform = useContext(GamePlatformContext);
  if (!platform) {
    throw new Error("GamePlatformContext is missing");
  }
  return platform;
}
