import { describe, expect, it } from "vitest";
import { createDefaultPlayerMeta } from "../../src/meta/player-meta";
import { applyMetaMatchResult } from "../../src/meta/apply-meta-match-result";

describe("player meta progression", () => {
  it("awards coins, stats and first-win achievements", () => {
    const meta = createDefaultPlayerMeta(1);
    const update = applyMetaMatchResult(
      meta,
      {
        variant: "podkidnoy",
        participantCount: 4,
        placement: 1,
        technicalLoss: false,
        surrendered: false
      },
      100
    );

    expect(update.delta.coins).toBe(36);
    expect(update.meta.coins).toBe(36);
    expect(update.meta.stats.matchesPlayed).toBe(1);
    expect(update.meta.stats.wins).toBe(1);
    expect(update.meta.stats.byVariant.podkidnoy.wins).toBe(1);
    expect(update.meta.stats.byParticipants["4"].wins).toBe(1);
    expect(update.meta.achievements).toEqual(
      expect.arrayContaining([
        "first_match",
        "first_win",
        "four_player_win"
      ])
    );
  });

  it("counts surrender and technical loss but awards no coins", () => {
    const meta = createDefaultPlayerMeta();
    const surrender = applyMetaMatchResult(meta, {
      variant: "perevodnoy",
      participantCount: 2,
      placement: 2,
      technicalLoss: false,
      surrendered: true
    }).meta;
    const timeout = applyMetaMatchResult(surrender, {
      variant: "perevodnoy",
      participantCount: 2,
      placement: 2,
      technicalLoss: true,
      surrendered: false
    });

    expect(timeout.delta.coins).toBe(0);
    expect(timeout.meta.coins).toBe(0);
    expect(timeout.meta.stats.matchesPlayed).toBe(2);
    expect(timeout.meta.stats.losses).toBe(2);
    expect(timeout.meta.stats.surrenders).toBe(1);
    expect(timeout.meta.stats.technicalLosses).toBe(1);
  });

  it("unlocks streak achievements only once", () => {
    let meta = createDefaultPlayerMeta();

    for (let index = 0; index < 3; index += 1) {
      meta = applyMetaMatchResult(meta, {
        variant: "podkidnoy",
        participantCount: 2,
        placement: 1,
        technicalLoss: false,
        surrendered: false
      }).meta;
    }

    expect(meta.stats.currentStreak).toBe(3);
    expect(meta.achievements.filter((id) => id === "streak_3"))
      .toHaveLength(1);
  });
});
