import {
  cosmeticById
} from "../data/cosmetics";
import type { PlayerMetaV1 } from "../meta/player-meta";

export type CosmeticActionResult =
  | Readonly<{ ok: true; meta: PlayerMetaV1 }>
  | Readonly<{
      ok: false;
      reason:
        | "not-found"
        | "already-owned"
        | "not-owned"
        | "insufficient-coins";
    }>;

export function purchaseCosmetic(
  meta: PlayerMetaV1,
  cosmeticId: string,
  nowMs = Date.now()
): CosmeticActionResult {
  const cosmetic = cosmeticById(cosmeticId);
  if (!cosmetic) return { ok: false, reason: "not-found" };
  if (meta.cosmetics.unlocked.includes(cosmetic.id)) {
    return { ok: false, reason: "already-owned" };
  }
  if (meta.coins < cosmetic.price) {
    return { ok: false, reason: "insufficient-coins" };
  }

  return {
    ok: true,
    meta: {
      ...meta,
      coins: meta.coins - cosmetic.price,
      cosmetics: {
        ...meta.cosmetics,
        unlocked: [...meta.cosmetics.unlocked, cosmetic.id]
      },
      updatedAtMs: Math.max(meta.updatedAtMs, Math.floor(nowMs))
    }
  };
}

export function equipCosmetic(
  meta: PlayerMetaV1,
  cosmeticId: string,
  nowMs = Date.now()
): CosmeticActionResult {
  const cosmetic = cosmeticById(cosmeticId);
  if (!cosmetic) return { ok: false, reason: "not-found" };
  if (!meta.cosmetics.unlocked.includes(cosmetic.id)) {
    return { ok: false, reason: "not-owned" };
  }

  return {
    ok: true,
    meta: {
      ...meta,
      cosmetics: {
        ...meta.cosmetics,
        equipped: {
          ...meta.cosmetics.equipped,
          [cosmetic.category]: cosmetic.id
        }
      },
      updatedAtMs: Math.max(meta.updatedAtMs, Math.floor(nowMs))
    }
  };
}
