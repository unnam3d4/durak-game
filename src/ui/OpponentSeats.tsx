import type { ParticipantId } from "../core/participants";
import type { Language } from "../i18n/i18n";
import { PlayerSeat } from "./PlayerSeat";
import type { SeatPresentation } from "./seat-presentation";

type Props = Readonly<{
  seats: readonly SeatPresentation[];
  finishOrder: readonly ParticipantId[];
  foolId: ParticipantId | null;
  finished: boolean;
  status: string;
  remainingMs: number;
  timerPaused: boolean;
  lang?: Language;
}>;

export function OpponentSeats({
  seats,
  finishOrder,
  foolId,
  finished,
  status,
  remainingMs,
  timerPaused,
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
            className={[
              "multiplayer-seat",
              seat.active && "multiplayer-seat--active",
              isFinished && "multiplayer-seat--finished",
              isFool && "multiplayer-seat--fool"
            ]
              .filter(Boolean)
              .join(" ")}
            key={seat.participantId}
            data-seat-participant-id={seat.participantId}
            data-testid={`seat-${seat.participantId}`}
          >
            <PlayerSeat
              name={seat.nickname}
              cardCount={seat.cardCount}
              active={seat.active}
              opponent
              turnStatus={seat.active ? status : undefined}
              remainingMs={seat.active ? remainingMs : undefined}
              timerPaused={timerPaused}
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
