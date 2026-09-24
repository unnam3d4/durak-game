import type { KeyValueStorage } from "../save/storage";

export const PLAYER_SETTINGS_KEY = "durakPlayerSettingsV1";

export type PlayerSettingsV1 = Readonly<{
  schemaVersion: 1;
  soundEnabled: boolean;
}>;

export const DEFAULT_PLAYER_SETTINGS: PlayerSettingsV1 = {
  schemaVersion: 1,
  soundEnabled: true
};

function isPlayerSettings(value: unknown): value is PlayerSettingsV1 {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.soundEnabled === "boolean"
  );
}

export function loadPlayerSettings(
  storage: KeyValueStorage
): PlayerSettingsV1 {
  try {
    const raw = storage.getItem(PLAYER_SETTINGS_KEY);
    if (!raw) return DEFAULT_PLAYER_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    return isPlayerSettings(parsed)
      ? parsed
      : DEFAULT_PLAYER_SETTINGS;
  } catch {
    return DEFAULT_PLAYER_SETTINGS;
  }
}

export function savePlayerSettings(
  storage: KeyValueStorage,
  settings: PlayerSettingsV1
): void {
  storage.setItem(PLAYER_SETTINGS_KEY, JSON.stringify(settings));
}
