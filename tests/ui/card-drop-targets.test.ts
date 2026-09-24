import { describe, expect, it } from "vitest";
import { toMultiplayerPlayerView } from "../../src/core/multiplayer-public-view";
import { resolveCardDropAction } from "../../src/ui/card-drop-targets";
import { card } from "../support/match-fixtures";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("resolveCardDropAction", () => {
  it("resolves an opening attack onto the battlefield", () => {
    const opening = card("clubs", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [opening, card("diamonds", 9)],
        bot: [card("clubs", 10), card("hearts", 11)],
        bot2: [card("spades", 12)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });
    const view = toMultiplayerPlayerView(state, "human");

    expect(
      resolveCardDropAction(view, opening.id, { type: "battlefield" })
    ).toEqual({
      type: "play-attack",
      playerId: "human",
      cardId: opening.id
    });
  });

  it("returns undefined for an illegal card drop", () => {
    const legal = card("clubs", 7);
    const illegal = card("diamonds", 9);
    const state = makeMultiplayerState({
      hands: {
        human: [legal],
        bot: [card("clubs", 10)],
        bot2: [card("spades", 12)],
        bot3: []
      },
      attackerId: "human",
      defenderId: "bot",
      activePlayerId: "human",
      phase: "attack",
      table: []
    });
    const view = toMultiplayerPlayerView(state, "human");

    expect(
      resolveCardDropAction(view, illegal.id, { type: "battlefield" })
    ).toBeUndefined();
  });

  it("resolves defense only onto the matching uncovered attack", () => {
    const defense = card("clubs", 8);
    const clubsAttack = card("clubs", 7);
    const heartsAttack = card("hearts", 7);
    const state = makeMultiplayerState({
      hands: {
        human: [defense],
        bot: [card("diamonds", 9)],
        bot2: [card("spades", 10)],
        bot3: []
      },
      trumpCard: card("spades", 14),
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [
        { attack: clubsAttack },
        { attack: heartsAttack }
      ]
    });
    const view = toMultiplayerPlayerView(state, "human");

    expect(
      resolveCardDropAction(view, defense.id, {
        type: "attack-card",
        attackCardId: clubsAttack.id
      })
    ).toEqual({
      type: "play-defense",
      playerId: "human",
      attackCardId: clubsAttack.id,
      cardId: defense.id
    });

    expect(
      resolveCardDropAction(view, defense.id, {
        type: "attack-card",
        attackCardId: heartsAttack.id
      })
    ).toBeUndefined();
  });

  it("resolves a single Perevodnoy card dropped onto the transfer slot", () => {
    const transferCard = card("diamonds", 7);
    const opening = card("clubs", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [transferCard, card("spades", 9)],
        bot: [card("clubs", 8), card("diamonds", 10)],
        bot2: [card("hearts", 11), card("spades", 12)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2
    });
    const view = toMultiplayerPlayerView(state, "human");

    expect(
      resolveCardDropAction(view, transferCard.id, { type: "transfer" })
    ).toEqual({
      type: "transfer",
      playerId: "human",
      cardIds: [transferCard.id]
    });
  });

  it("does not silently turn a Perevodnoy drag into a transfer", () => {
    const transferCard = card("diamonds", 7);
    const opening = card("clubs", 7);
    const state = makeMultiplayerState({
      variant: "perevodnoy",
      hands: {
        human: [transferCard, card("spades", 9)],
        bot: [card("clubs", 8), card("diamonds", 10)],
        bot2: [card("hearts", 11), card("spades", 12)],
        bot3: []
      },
      attackerId: "bot",
      defenderId: "human",
      activePlayerId: "human",
      phase: "defend",
      table: [{ attack: opening }],
      defenderHandSizeAtBoutStart: 2
    });
    const view = toMultiplayerPlayerView(state, "human");

    expect(
      view.legalActions.some((action) => action.type === "transfer")
    ).toBe(true);
    expect(
      resolveCardDropAction(view, transferCard.id, { type: "battlefield" })
    ).toBeUndefined();
  });
});
