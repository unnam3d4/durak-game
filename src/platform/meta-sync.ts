import type { GamePlatform } from "./game-platform";
import type { PlayerMetaV1 } from "../meta/player-meta";
import { savePlayerMeta } from "../meta/meta-storage";

export const CLOUD_META_KEY = "durakMetaV1";

export function chooseNewerMeta(
  localMeta: PlayerMetaV1 | null,
  cloudMeta: PlayerMetaV1 | null
): PlayerMetaV1 | null {
  if (!localMeta) return cloudMeta;
  if (!cloudMeta) return localMeta;
  return cloudMeta.updatedAtMs > localMeta.updatedAtMs
    ? cloudMeta
    : localMeta;
}

export async function syncPlayerMeta(
  platform: GamePlatform,
  localMeta: PlayerMetaV1 | null
): Promise<PlayerMetaV1 | null> {
  if (!platform.isAuthorized() || !platform.loadCloudMeta) {
    return localMeta;
  }

  let cloudMeta: PlayerMetaV1 | null = null;
  try {
    cloudMeta = await platform.loadCloudMeta();
  } catch {
    cloudMeta = null;
  }

  const chosen = chooseNewerMeta(localMeta, cloudMeta);
  if (!chosen) return null;

  try {
    savePlayerMeta(platform.storage, chosen);
  } catch {
    // Keep valid in-memory meta if storage is restricted.
  }

  if (platform.saveCloudMeta) {
    try {
      await platform.saveCloudMeta(chosen);
    } catch {
      // Cloud synchronization is best-effort.
    }
  }

  return chosen;
}
