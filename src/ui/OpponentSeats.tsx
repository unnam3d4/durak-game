import type { ParticipantId } from "../core/participants";
import type { Language } from "../i18n/i18n";
import { PlayerSeat } from "./PlayerSeat";
import type { SeatPresentation } from "./seat-presentation";

type Props = Readonly<{
  seats: readonly SeatPresentation[];
  finishOrder: readonly ParticipantId[];
  foolId: ParticipantId | null;
  finished: boolean;
  lang?: Language;
}>;

export function OpponentSeats({
  seats,
  finishOrder,
  foolId,
  finished,
  lang = "ru"
}: Props) {
  const opponents = seats.filter(
    (seat) => seat.participantId !== "human"
  );

  return (
    <div
      className={`multiplayer-opponents multiplayer-opponents--${opponents.length}`}
    >
      {opponents.map((seat) => {
        const isFinished = finishOrder.includes(seat.participantId);
        const isFool =
          finished && foolId === seat.participantId;

        return (
          <div
            className={
              isFool
                ? "multiplayer-seat multiplayer-seat--fool"
                : isFinished
                  ? "multiplayer-seat multiplayer-seat--finished"
                  : "multiplayer-seat"
            }
            key={seat.participantId}
            data-seat-participant-id={seat.participantId}
            data-testid={`seat-${seat.participantId}`}
          >
            <PlayerSeat
              name={seat.nickname}
              cardCount={seat.cardCount}
              active={seat.active}
              opponent
              lang={lang}
            />
            {seat.placement ? (
              <span
                className={
                  isFool
                    ? "seat-finished-label seat-finished-label--fool"
                    : "seat-finished-label"
                }
              >
                {seat.placement}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
