import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeGamePlatform } from "../../src/platform/yandex-games";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("initializeGamePlatform", () => {
  it("uses a working standalone fallback when the SDK is absent", async () => {
    vi.stubGlobal("YaGames", undefined);

    const platform = await initializeGamePlatform();

    expect(platform.kind).toBe("standalone");
    expect(platform.lang).toBe("ru");
    expect(platform.isAuthorized()).toBe(false);

    platform.storage.setItem("probe", "ok");
    expect(platform.storage.getItem("probe")).toBe("ok");
    platform.storage.removeItem("probe");
    expect(platform.storage.getItem("probe")).toBeNull();
  });

  it("uses the same fallback when SDK initialization rejects", async () => {
    vi.stubGlobal("YaGames", {
      init: vi.fn().mockRejectedValue(new Error("SDK unavailable"))
    });

    const platform = await initializeGamePlatform();

    expect(platform.kind).toBe("standalone");
    expect(platform.lang).toBe("ru");
    platform.storage.setItem("probe", "ok");
    expect(platform.storage.getItem("probe")).toBe("ok");
  });

  it("wraps Yandex capabilities without exposing the raw SDK", async () => {
    const pauseListener = vi.fn();
    const on = vi.fn();
    const off = vi.fn();
    const ready = vi.fn();
    const start = vi.fn();
    const stop = vi.fn();

    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    vi.stubGlobal("YaGames", {
      init: vi.fn().mockResolvedValue({
        environment: { i18n: { lang: "en" } },
        getStorage: vi.fn().mockResolvedValue(storage),
        getPlayer: vi.fn().mockResolvedValue({
          isAuthorized: () => true
        }),
        features: {
          LoadingAPI: { ready },
          GameplayAPI: { start, stop }
        },
        auth: {
          openAuthDialog: vi.fn().mockResolvedValue(undefined)
        },
        on,
        off
      })
    });

    const platform = await initializeGamePlatform();

    expect(platform.kind).toBe("yandex");
    expect(platform.lang).toBe("en");
    expect(platform.storage).toBe(storage);
    expect(platform.isAuthorized()).toBe(true);

    platform.loadingReady();
    platform.gameplayStart();
    platform.gameplayStop();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);

    const unsubscribe = platform.onPlatformPause(pauseListener);
    expect(on).toHaveBeenCalledWith("game_api_pause", pauseListener);
    unsubscribe();
    expect(off).toHaveBeenCalledWith("game_api_pause", pauseListener);
  });
});
