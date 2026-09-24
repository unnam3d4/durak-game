import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import type { ParticipantId } from "../core/participants";
import type { OpponentSeatProfile } from "../matchmaking/opponent-profiles";
import {
  placementLabel,
  type Language
} from "../i18n/i18n";

export type SeatPresentation = Readonly<{
  participantId: ParticipantId;
  nickname: string;
  cardCount: number;
  active: boolean;
  placement: string | null;
}>;

export const DEFAULT_SEAT_NAMES: Readonly<Record<ParticipantId, string>> = {
  human: "Игрок",
  bot: "Соперник 1",
  bot2: "Соперник 2",
  bot3: "Соперник 3"
};

export function defaultSeatNames(
  lang: Language
): Readonly<Record<ParticipantId, string>> {
  if (lang === "ru") return DEFAULT_SEAT_NAMES;
  return {
    human: "Player",
    bot: "Opponent 1",
    bot2: "Opponent 2",
    bot3: "Opponent 3"
  };
}

export function placementForParticipant(
  state: MultiplayerGameState,
  participantId: ParticipantId,
  lang: Language = "ru"
): string | null {
  const finishIndex = state.finishOrder.indexOf(participantId);
  if (finishIndex >= 0) {
    return placementLabel(lang, finishIndex + 1);
  }
  if (
    state.phase === "finished" &&
    state.foolId === participantId
  ) {
    return lang === "ru" ? "дурак" : "Durak";
  }
  return null;
}

type CreateSeatPresentationsInput = Readonly<{
  state: MultiplayerGameState;
  playerNickname: string;
  opponentProfiles: readonly OpponentSeatProfile[];
  interactionBlocked: boolean;
  lang?: Language;
}>;

export function createSeatPresentations({
  state,
  playerNickname,
  opponentProfiles,
  interactionBlocked,
  lang = "ru"
}: CreateSeatPresentationsInput): readonly SeatPresentation[] {
  const nicknameById: Record<ParticipantId, string> = {
    ...defaultSeatNames(lang),
    human: playerNickname
  };

  for (const profile of opponentProfiles) {
    nicknameById[profile.participantId] = profile.nickname;
  }

  return state.participants.map((participantId) => ({
    participantId,
    nickname: nicknameById[participantId],
    cardCount: state.hands[participantId].length,
    active:
      state.phase !== "finished" &&
      !interactionBlocked &&
      state.activePlayerId === participantId,
    placement: placementForParticipant(
      state,
      participantId,
      lang
    )
  }));
}
