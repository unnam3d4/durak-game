import type { Player, SDK } from "ysdk";
import type { GamePlatform } from "./game-platform";
import type { KeyValueStorage } from "../save/storage";
import {
  sanitizePlayerProfile
} from "../profile/profile-storage";
import {
  CLOUD_PROFILE_KEY
} from "./profile-sync";
import {
  RATING_LEADERBOARD_NAME,
  leaderboardScore,
  toLeaderboardSnapshot
} from "./leaderboard";

type YaGamesBootstrap = Readonly<{
  init: () => Promise<SDK>;
}>;

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    }
  };
}

function localStorageOrMemory(): KeyValueStorage {
  try {
    const storage = globalThis.localStorage;
    const probeKey = "__durak_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return createMemoryStorage();
  }
}

function standalonePlatform(): GamePlatform {
  const noSubscription = () => () => undefined;

  return {
    kind: "standalone",
    lang: "ru",
    storage: localStorageOrMemory(),
    isAuthorized: () => false,
    loadingReady: () => undefined,
    gameplayStart: () => undefined,
    gameplayStop: () => undefined,
    authorize: async () => false,
    saveCloudProfile: async () => undefined,
    loadCloudProfile: async () => null,
    setLeaderboardScore: async () => undefined,
    getLeaderboard: async () => null,
    showInterstitial: async () => undefined,
    onPlatformPause: noSubscription,
    onPlatformResume: noSubscription
  };
}

function yandexBootstrap(): YaGamesBootstrap | undefined {
  return (
    globalThis as typeof globalThis & {
      YaGames?: YaGamesBootstrap;
    }
  ).YaGames;
}

export async function initializeGamePlatform(): Promise<GamePlatform> {
  const yaGames = yandexBootstrap();
  if (!yaGames) {
    return standalonePlatform();
  }

  try {
    const ysdk = await yaGames.init();
    const storage = await ysdk
      .getStorage()
      .catch(() => localStorageOrMemory());

    let player: Player | null = await ysdk
      .getPlayer()
      .catch(() => null);

    const authorizedPlayer = (): Player | null =>
      player?.isAuthorized() ? player : null;

    const subscribe = (
      event: "game_api_pause" | "game_api_resume",
      listener: () => void
    ): (() => void) => {
      ysdk.on(event, listener);
      return () => {
        ysdk.off(event, listener);
      };
    };

    return {
      kind: "yandex",
      lang: ysdk.environment.i18n.lang || "ru",
      storage,
      isAuthorized: () => authorizedPlayer() !== null,
      loadingReady: () => {
        ysdk.features.LoadingAPI.ready();
      },
      gameplayStart: () => {
        ysdk.features.GameplayAPI.start();
      },
      gameplayStop: () => {
        ysdk.features.GameplayAPI.stop();
      },
      authorize: async () => {
        try {
          await ysdk.auth.openAuthDialog();
          player = await ysdk.getPlayer().catch(() => null);
          return authorizedPlayer() !== null;
        } catch {
          return false;
        }
      },
      saveCloudProfile: async (profile) => {
        const current = authorizedPlayer();
        if (!current) return;

        try {
          await current.setData(
            { [CLOUD_PROFILE_KEY]: profile },
            true
          );
        } catch {
          // Local safe storage remains authoritative during cloud outages.
        }
      },
      loadCloudProfile: async () => {
        const current = authorizedPlayer();
        if (!current) return null;

        try {
          const data = await current.getData([CLOUD_PROFILE_KEY]);
          return sanitizePlayerProfile(data[CLOUD_PROFILE_KEY]);
        } catch {
          return null;
        }
      },
      setLeaderboardScore: async (score) => {
        if (!authorizedPlayer()) return;

        try {
          const available = await ysdk.isAvailableMethod(
            "leaderboards.setScore"
          );
          if (!available) return;

          await ysdk.leaderboards.setScore(
            RATING_LEADERBOARD_NAME,
            leaderboardScore(score)
          );
        } catch {
          // Ranking is best-effort and must never block a completed match.
        }
      },
      getLeaderboard: async () => {
        if (!authorizedPlayer()) return null;

        try {
          const available = await ysdk.isAvailableMethod(
            "leaderboards.getEntries"
          );
          if (!available) return null;

          const data = await ysdk.leaderboards.getEntries(
            RATING_LEADERBOARD_NAME,
            {
              quantityTop: 10,
              quantityAround: 3,
              includeUser: true
            }
          );
          return toLeaderboardSnapshot(data);
        } catch {
          return null;
        }
      },
      showInterstitial: async () => {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };

          try {
            ysdk.adv.showFullscreenAdv({
              callbacks: {
                onClose: finish,
                onError: finish,
                onOffline: finish
              }
            });
          } catch {
            finish();
          }
        });
      },
      onPlatformPause: (listener) =>
        subscribe("game_api_pause", listener),
      onPlatformResume: (listener) =>
        subscribe("game_api_resume", listener)
    };
  } catch {
    return standalonePlatform();
  }
}
