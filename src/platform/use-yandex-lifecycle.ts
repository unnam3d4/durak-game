import { useCallback, useEffect, useRef } from "react";
import type { GamePlatform } from "./game-platform";

export type AudioPauseService = Readonly<{
  pauseAll: () => void;
}>;

const NOOP_AUDIO: AudioPauseService = {
  pauseAll: () => undefined
};

export function useYandexLifecycle(
  platform: GamePlatform | null,
  gameplayActive: boolean,
  audio: AudioPauseService = NOOP_AUDIO
): void {
  const activeRef = useRef(gameplayActive);
  const runningRef = useRef(false);
  const loadingReadyRef = useRef(false);
  const documentHiddenRef = useRef(
    document.visibilityState === "hidden"
  );
  const windowBlurredRef = useRef(false);
  const platformPausedRef = useRef(false);

  activeRef.current = gameplayActive;

  const environmentPaused = useCallback(
    () =>
      documentHiddenRef.current ||
      windowBlurredRef.current ||
      platformPausedRef.current,
    []
  );

  const syncGameplay = useCallback(() => {
    if (!platform) return;

    const shouldRun =
      activeRef.current && !environmentPaused();
    if (shouldRun === runningRef.current) return;

    runningRef.current = shouldRun;
    if (shouldRun) {
      platform.gameplayStart();
    } else {
      platform.gameplayStop();
    }
  }, [environmentPaused, platform]);

  useEffect(() => {
    if (!platform || loadingReadyRef.current) return;
    loadingReadyRef.current = true;
    platform.loadingReady();
  }, [platform]);

  useEffect(() => {
    syncGameplay();
  }, [gameplayActive, syncGameplay]);

  useEffect(() => {
    if (!platform) return;

    const pauseForEnvironment = (
      source: "document" | "window" | "platform"
    ) => {
      const wasPaused = environmentPaused();

      if (source === "document") {
        documentHiddenRef.current = true;
      } else if (source === "window") {
        windowBlurredRef.current = true;
      } else {
        platformPausedRef.current = true;
      }

      if (!wasPaused) {
        audio.pauseAll();
      }
      syncGameplay();
    };

    const resumeEnvironment = (
      source: "document" | "window" | "platform"
    ) => {
      if (source === "document") {
        documentHiddenRef.current = false;
      } else if (source === "window") {
        windowBlurredRef.current = false;
      } else {
        platformPausedRef.current = false;
      }
      syncGameplay();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseForEnvironment("document");
      } else {
        resumeEnvironment("document");
      }
    };
    const onBlur = () => pauseForEnvironment("window");
    const onFocus = () => resumeEnvironment("window");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    const unsubscribePause = platform.onPlatformPause(() =>
      pauseForEnvironment("platform")
    );
    const unsubscribeResume = platform.onPlatformResume(() =>
      resumeEnvironment("platform")
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      unsubscribePause();
      unsubscribeResume();

      if (runningRef.current) {
        runningRef.current = false;
        platform.gameplayStop();
      }
    };
  }, [audio, environmentPaused, platform, syncGameplay]);
}
