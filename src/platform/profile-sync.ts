import type { GamePlatform } from "./game-platform";
import type { PlayerProfileV1 } from "../profile/player-profile";
import { savePlayerProfile } from "../profile/profile-storage";

export const CLOUD_PROFILE_KEY = "durakProfileV1";

export function chooseNewerProfile(
  localProfile: PlayerProfileV1 | null,
  cloudProfile: PlayerProfileV1 | null
): PlayerProfileV1 | null {
  if (!localProfile) return cloudProfile;
  if (!cloudProfile) return localProfile;
  return cloudProfile.updatedAtMs > localProfile.updatedAtMs
    ? cloudProfile
    : localProfile;
}

export async function syncPlayerProfile(
  platform: GamePlatform,
  localProfile: PlayerProfileV1 | null
): Promise<PlayerProfileV1 | null> {
  if (!platform.isAuthorized()) return localProfile;

  let cloudProfile: PlayerProfileV1 | null = null;
  try {
    cloudProfile = await platform.loadCloudProfile();
  } catch {
    cloudProfile = null;
  }

  const chosen = chooseNewerProfile(localProfile, cloudProfile);
  if (!chosen) return null;

  try {
    savePlayerProfile(platform.storage, chosen);
  } catch {
    // Cloud sync must never make a valid in-memory profile unusable.
  }

  try {
    await platform.saveCloudProfile(chosen);
  } catch {
    // A transient cloud failure must not block local play.
  }

  return chosen;
}
