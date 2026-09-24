import type { Player, SDK } from "ysdk";
import type { GamePlatform } from "./game-platform";
import type { KeyValueStorage } from "../save/storage";

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
      isAuthorized: () => player?.isAuthorized() ?? false,
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
          return player?.isAuthorized() ?? false;
        } catch {
          return false;
        }
      },
      saveCloudProfile: async () => undefined,
      loadCloudProfile: async () => null,
      setLeaderboardScore: async () => undefined,
      getLeaderboard: async () => null,
      showInterstitial: async () => undefined,
      onPlatformPause: (listener) =>
        subscribe("game_api_pause", listener),
      onPlatformResume: (listener) =>
        subscribe("game_api_resume", listener)
    };
  } catch {
    return standalonePlatform();
  }
}
