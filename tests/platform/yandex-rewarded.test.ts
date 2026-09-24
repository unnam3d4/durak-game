import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeGamePlatform } from "../../src/platform/yandex-games";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function installSdk(
  showRewardedVideo: (options?: {
    callbacks?: {
      onRewarded?: () => void;
      onClose?: () => void;
      onError?: (error: Error) => void;
    };
  }) => void
): void {
  vi.stubGlobal("YaGames", {
    init: vi.fn().mockResolvedValue({
      environment: { i18n: { lang: "ru" } },
      getStorage: vi.fn().mockResolvedValue(window.localStorage),
      getPlayer: vi.fn().mockResolvedValue({
        isAuthorized: () => false
      }),
      features: {
        LoadingAPI: { ready: vi.fn() },
        GameplayAPI: { start: vi.fn(), stop: vi.fn() }
      },
      auth: {
        openAuthDialog: vi.fn().mockResolvedValue(undefined)
      },
      adv: {
        showFullscreenAdv: vi.fn(),
        showRewardedVideo
      },
      on: vi.fn(),
      off: vi.fn()
    })
  });
}

describe("Yandex rewarded video", () => {
  it("returns true only after an actual reward callback", async () => {
    installSdk((options) => {
      options?.callbacks?.onRewarded?.();
      options?.callbacks?.onClose?.();
    });

    const platform = await initializeGamePlatform();

    await expect(platform.showRewarded?.()).resolves.toBe(true);
  });

  it("returns false when the video closes without reward", async () => {
    installSdk((options) => {
      options?.callbacks?.onClose?.();
    });

    const platform = await initializeGamePlatform();

    await expect(platform.showRewarded?.()).resolves.toBe(false);
  });

  it("returns false on ad error", async () => {
    installSdk((options) => {
      options?.callbacks?.onError?.(new Error("unavailable"));
    });

    const platform = await initializeGamePlatform();

    await expect(platform.showRewarded?.()).resolves.toBe(false);
  });
});
