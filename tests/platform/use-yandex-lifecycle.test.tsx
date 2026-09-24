import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlatform } from "../../src/platform/game-platform";
import {
  useYandexLifecycle,
  type AudioPauseService
} from "../../src/platform/use-yandex-lifecycle";

type Listener = () => void;

function createPlatform() {
  let pauseListener: Listener | null = null;
  let resumeListener: Listener | null = null;

  const platform: GamePlatform = {
    kind: "yandex",
    lang: "ru",
    storage: window.localStorage,
    isAuthorized: () => false,
    loadingReady: vi.fn(),
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    authorize: async () => false,
    saveCloudProfile: async () => undefined,
    loadCloudProfile: async () => null,
    setLeaderboardScore: async () => undefined,
    getLeaderboard: async () => null,
    showInterstitial: async () => undefined,
    onPlatformPause: (listener) => {
      pauseListener = listener;
      return () => {
        if (pauseListener === listener) pauseListener = null;
      };
    },
    onPlatformResume: (listener) => {
      resumeListener = listener;
      return () => {
        if (resumeListener === listener) resumeListener = null;
      };
    }
  };

  return {
    platform,
    pause: () => pauseListener?.(),
    resume: () => resumeListener?.()
  };
}

function Harness({
  platform,
  active,
  audio
}: Readonly<{
  platform: GamePlatform;
  active: boolean;
  audio?: AudioPauseService;
}>) {
  useYandexLifecycle(platform, active, audio);
  return null;
}

afterEach(() => {
  cleanup();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible"
  });
});

describe("useYandexLifecycle", () => {
  it("marks loading ready once and starts/stops gameplay on screen transitions", () => {
    const { platform } = createPlatform();
    const { rerender } = render(
      <Harness platform={platform} active={false} />
    );

    expect(platform.loadingReady).toHaveBeenCalledTimes(1);
    expect(platform.gameplayStart).not.toHaveBeenCalled();

    rerender(<Harness platform={platform} active />);
    expect(platform.loadingReady).toHaveBeenCalledTimes(1);
    expect(platform.gameplayStart).toHaveBeenCalledTimes(1);

    rerender(<Harness platform={platform} active={false} />);
    expect(platform.gameplayStop).toHaveBeenCalledTimes(1);
  });

  it("pauses gameplay and audio while hidden, then resumes only for an active match", () => {
    const { platform } = createPlatform();
    const audio = { pauseAll: vi.fn() };
    const { rerender } = render(
      <Harness platform={platform} active audio={audio} />
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(platform.gameplayStop).toHaveBeenCalledTimes(1);
    expect(audio.pauseAll).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(platform.gameplayStart).toHaveBeenCalledTimes(2);

    rerender(
      <Harness platform={platform} active={false} audio={audio} />
    );
    act(() => {
      window.dispatchEvent(new Event("blur"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(platform.gameplayStart).toHaveBeenCalledTimes(2);
  });

  it("deduplicates browser and platform pause sources until all are resumed", () => {
    const { platform, pause, resume } = createPlatform();
    const audio = { pauseAll: vi.fn() };
    render(<Harness platform={platform} active audio={audio} />);

    act(() => {
      window.dispatchEvent(new Event("blur"));
      pause();
    });
    expect(platform.gameplayStop).toHaveBeenCalledTimes(1);
    expect(audio.pauseAll).toHaveBeenCalledTimes(1);

    act(() => {
      resume();
    });
    expect(platform.gameplayStart).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(platform.gameplayStart).toHaveBeenCalledTimes(2);
  });

  it("treats a result screen as stopped gameplay", () => {
    const { platform } = createPlatform();
    const { rerender } = render(
      <Harness platform={platform} active />
    );

    expect(platform.gameplayStart).toHaveBeenCalledTimes(1);

    rerender(<Harness platform={platform} active={false} />);
    expect(platform.gameplayStop).toHaveBeenCalledTimes(1);
  });
});
