import { useEffect, useRef, useState } from "react";
import type { ParticipantId } from "../core/participants";
import type { OpponentSeatProfile } from "../matchmaking/opponent-profiles";
import type { SearchSchedule } from "../matchmaking/search-schedule";
import {
  t,
  type Language
} from "../i18n/i18n";

type BotParticipantId = Exclude<ParticipantId, "human">;

type Props = Readonly<{
  schedule: SearchSchedule;
  opponents: readonly OpponentSeatProfile[];
  onCancel: () => void;
  onComplete: () => void;
  lang?: Language;
}>;

export function MatchSearchScreen({
  schedule,
  opponents,
  onCancel,
  onComplete,
  lang = "ru"
}: Props) {
  const [revealed, setRevealed] = useState<ReadonlySet<BotParticipantId>>(
    () => new Set()
  );
  const cancelledRef = useRef(false);
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    cancelledRef.current = false;
    completedRef.current = false;
    const timers: number[] = [];

    for (const reveal of schedule.reveals) {
      timers.push(
        window.setTimeout(() => {
          if (cancelledRef.current) return;
          setRevealed((current) => {
            const next = new Set(current);
            next.add(reveal.participantId);
            return next;
          });
        }, reveal.revealAtMs)
      );
    }

    timers.push(
      window.setTimeout(() => {
        if (cancelledRef.current || completedRef.current) return;
        completedRef.current = true;
        onComplete();
      }, schedule.completeAtMs)
    );
    timersRef.current = timers;

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [onComplete, schedule]);

  const cancel = () => {
    if (completedRef.current || cancelledRef.current) return;
    cancelledRef.current = true;
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
    onCancel();
  };

  return (
    <main className="menu-shell">
      <section className="menu-frame match-search">
        <div className="menu-brand">
          <span className="eyebrow">{t(lang, "matchmakingTitle")}</span>
          <h1>{t(lang, "matchmakingSearch")}</h1>
          <p>{t(lang, "matchmakingHint")}</p>
        </div>

        <div
          className="match-search__seats"
          aria-label={t(lang, "opponents")}
        >
          {opponents.map((opponent) => {
            const isRevealed = revealed.has(opponent.participantId);
            return (
              <div
                className={
                  isRevealed
                    ? "match-search__seat match-search__seat--revealed"
                    : "match-search__seat"
                }
                key={opponent.participantId}
              >
                <span>
                  {isRevealed
                    ? opponent.nickname
                    : t(lang, "searching")}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="menu-button menu-button--secondary"
          onClick={cancel}
        >
          <strong>{t(lang, "cancel")}</strong>
        </button>
      </section>
    </main>
  );
}
