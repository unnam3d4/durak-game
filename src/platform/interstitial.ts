import type { GamePlatform } from "./game-platform";

export async function runInterstitialThen(
  platform: GamePlatform | null | undefined,
  continuation: () => void
): Promise<void> {
  let continued = false;
  const continueOnce = () => {
    if (continued) return;
    continued = true;
    continuation();
  };

  if (!platform) {
    continueOnce();
    return;
  }

  try {
    await platform.showInterstitial();
  } catch {
    // Ads are never allowed to block navigation.
  } finally {
    continueOnce();
  }
}
