import { RELEASE_IMAGE_ASSETS } from "./game-assets";

type IdleWindow = Window &
  Readonly<{
    requestIdleCallback?: (
      callback: () => void,
      options?: Readonly<{ timeout?: number }>
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  }>;

let warmed = false;

function shouldSkipPreload(): boolean {
  return (
    typeof window === "undefined" ||
    typeof Image === "undefined" ||
    (typeof navigator !== "undefined" &&
      /jsdom/i.test(navigator.userAgent))
  );
}

function warmImages(): void {
  if (warmed || shouldSkipPreload()) return;
  warmed = true;

  for (const src of RELEASE_IMAGE_ASSETS) {
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      const decoded = image.decode?.();
      if (decoded && typeof decoded.catch === "function") {
        void decoded.catch(() => undefined);
      }
    } catch {
      // Preloading is a performance hint; normal image loading still works.
    }
  }
}

export function scheduleReleaseAssetPreload(): () => void {
  if (warmed || shouldSkipPreload()) return () => undefined;

  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(warmImages, {
      timeout: 1200
    });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(warmImages, 180);
  return () => window.clearTimeout(handle);
}
