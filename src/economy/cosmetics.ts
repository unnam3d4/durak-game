import {
  cosmeticById,
  type CosmeticCategory
} from "../data/cosmetics";
import type { PlayerProfile } from "../profile/player-profile";

export type CosmeticPurchaseFailure =
  | "not-found"
  | "already-owned"
  | "insufficient-coins";

export type CosmeticPurchaseResult =
  | Readonly<{ ok: true; profile: PlayerProfile }>
  | Readonly<{ ok: false; reason: CosmeticPurchaseFailure }>;

export type CosmeticEquipFailure =
  | "not-found"
  | "not-owned";

export type CosmeticEquipResult =
  | Readonly<{ ok: true; profile: PlayerProfile }>
  | Readonly<{ ok: false; reason: CosmeticEquipFailure }>;

export function purchaseCosmetic(
  profile: PlayerProfile,
  cosmeticId: string
): CosmeticPurchaseResult {
  const cosmetic = cosmeticById(cosmeticId);
  if (!cosmetic) return { ok: false, reason: "not-found" };

  if (profile.cosmetics.unlocked.includes(cosmetic.id)) {
    return { ok: false, reason: "already-owned" };
  }

  if (profile.coins < cosmetic.price) {
    return { ok: false, reason: "insufficient-coins" };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      coins: profile.coins - cosmetic.price,
      cosmetics: {
        ...profile.cosmetics,
        unlocked: [...profile.cosmetics.unlocked, cosmetic.id]
      }
    }
  };
}

export function equipCosmetic(
  profile: PlayerProfile,
  cosmeticId: string
): CosmeticEquipResult {
  const cosmetic = cosmeticById(cosmeticId);
  if (!cosmetic) return { ok: false, reason: "not-found" };

  if (!profile.cosmetics.unlocked.includes(cosmetic.id)) {
    return { ok: false, reason: "not-owned" };
  }

  const category: CosmeticCategory = cosmetic.category;
  return {
    ok: true,
    profile: {
      ...profile,
      cosmetics: {
        ...profile.cosmetics,
        equipped: {
          ...profile.cosmetics.equipped,
          [category]: cosmetic.id
        }
      }
    }
  };
}
