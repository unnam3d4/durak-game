import { describe, expect, it } from "vitest";
import { createSeatPresentations } from "../../src/ui/seat-presentation";
import { makeMultiplayerState } from "../support/multiplayer-fixtures";

describe("createSeatPresentations", () => {
  it("uses the supplied display names for all seats", () => {
    const state = makeMultiplayerState({}, 4);
    const seats = createSeatPresentations({
      state,
      playerNickname: "Vovan_77",
      opponentProfiles: [
        { participantId: "bot", nickname: "VIKTOR", hiddenRating: 1300, skill: "normal" },
        { participantId: "bot2", nickname: "Maks77", hiddenRating: 1280, skill: "normal" },
        { participantId: "bot3", nickname: "Димон", hiddenRating: 1310, skill: "normal" }
      ],
      interactionBlocked: false
    });

    expect(seats.map((seat) => seat.nickname)).toEqual([
      "Vovan_77",
      "VIKTOR",
      "Maks77",
      "Димон"
    ]);
    expect(seats.map((seat) => seat.cardCount)).toEqual([
      state.hands.human.length,
      state.hands.bot.length,
      state.hands.bot2.length,
      state.hands.bot3.length
    ]);
  });

  it("derives active and placement presentation from match state", () => {
    const state = makeMultiplayerState(
      { activePlayerId: "bot2", finishOrder: ["bot"], phase: "attack" },
      4
    );
    const seats = createSeatPresentations({
      state,
      playerNickname: "Player_1",
      opponentProfiles: [
        { participantId: "bot", nickname: "Aaa", hiddenRating: 1000, skill: "easy" },
        { participantId: "bot2", nickname: "Bbb", hiddenRating: 1000, skill: "easy" },
        { participantId: "bot3", nickname: "Ccc", hiddenRating: 1000, skill: "easy" }
      ],
      interactionBlocked: false
    });

    expect(seats.find((seat) => seat.participantId === "bot")).toMatchObject({
      active: false,
      placement: "1 место"
    });
    expect(seats.find((seat) => seat.participantId === "bot2")).toMatchObject({
      active: true,
      placement: null
    });
  });
});
