import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeGamePlatform } from "../../src/platform/yandex-games";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function installSdk(
  showFullscreenAdv: (options?: {
    callbacks?: {
      onClose?: (wasShown: boolean) => void;
      onError?: (error: Error) => void;
      onOffline?: () => void;
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
        GameplayAPI: {
          start: vi.fn(),
          stop: vi.fn()
        }
      },
      auth: {
        openAuthDialog: vi.fn().mockResolvedValue(undefined)
      },
      adv: {
        showFullscreenAdv
      },
      on: vi.fn(),
      off: vi.fn()
    })
  });
}

describe("Yandex fullscreen interstitial", () => {
  it("resolves after onClose", async () => {
    installSdk((options) => {
      options?.callbacks?.onClose?.(true);
    });

    const platform = await initializeGamePlatform();

    await expect(platform.showInterstitial()).resolves.toBeUndefined();
  });

  it("resolves after onError", async () => {
    installSdk((options) => {
      options?.callbacks?.onError?.(new Error("ad failed"));
    });

    const platform = await initializeGamePlatform();

    await expect(platform.showInterstitial()).resolves.toBeUndefined();
  });

  it("resolves after offline delivery", async () => {
    installSdk((options) => {
      options?.callbacks?.onOffline?.();
    });

    const platform = await initializeGamePlatform();

    await expect(platform.showInterstitial()).resolves.toBeUndefined();
  });

  it("ignores duplicate terminal callbacks", async () => {
    const terminalCalls = vi.fn();

    installSdk((options) => {
      options?.callbacks?.onClose?.(true);
      terminalCalls();
      options?.callbacks?.onError?.(new Error("late error"));
      terminalCalls();
      options?.callbacks?.onOffline?.();
      terminalCalls();
    });

    const platform = await initializeGamePlatform();
    await platform.showInterstitial();

    expect(terminalCalls).toHaveBeenCalledTimes(3);
  });

  it("standalone mode resolves immediately", async () => {
    vi.stubGlobal("YaGames", undefined);

    const platform = await initializeGamePlatform();

    await expect(platform.showInterstitial()).resolves.toBeUndefined();
  });
});
