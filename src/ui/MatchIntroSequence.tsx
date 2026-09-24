import { useEffect, useRef, useState } from "react";
import type { Card } from "../core/cards";
import type { ParticipantId } from "../core/participants";
import {
  t,
  type Language
} from "../i18n/i18n";
import { CardView } from "./CardView";

const SUIT_SYMBOLS: Readonly<Record<Card["suit"], string>> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

type Phase =
  | Readonly<{ type: "deal"; beatIndex: number }>
  | Readonly<{ type: "trump" }>
  | Readonly<{ type: "attacker" }>
  | Readonly<{ type: "done" }>;

type Props = Readonly<{
  participants: readonly ParticipantId[];
  attackerId: ParticipantId;
  trumpCard: Card;
  names: Readonly<Record<ParticipantId, string>>;
  beatMs?: number;
  trumpMs?: number;
  attackerMs?: number;
  reducedMotion?: boolean;
  onComplete: () => void;
  lang?: Language;
}>;

function systemReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function MatchIntroSequence({
  participants,
  attackerId,
  trumpCard,
  names,
  beatMs = 85,
  trumpMs = 320,
  attackerMs = 520,
  reducedMotion,
  onComplete,
  lang = "ru"
}: Props) {
  const [phase, setPhase] = useState<Phase>({
    type: "deal",
    beatIndex: 0
  });
  const completedRef = useRef(false);
  const shouldReduceMotion =
    reducedMotion ?? systemReducedMotion();
  const totalBeats = participants.length * 6;

  useEffect(() => {
    if (completedRef.current) return;

    if (shouldReduceMotion || totalBeats === 0) {
      completedRef.current = true;
      onComplete();
      return;
    }

    const timers: number[] = [];
    const safeBeatMs = Math.max(0, beatMs);
    const dealDuration = totalBeats * safeBeatMs;

    for (
      let beatIndex = 1;
      beatIndex < totalBeats;
      beatIndex += 1
    ) {
      timers.push(
        window.setTimeout(
          () => setPhase({ type: "deal", beatIndex }),
          beatIndex * safeBeatMs
        )
      );
    }

    timers.push(
      window.setTimeout(
        () => setPhase({ type: "trump" }),
        dealDuration
      )
    );
    timers.push(
      window.setTimeout(
        () => setPhase({ type: "attacker" }),
        dealDuration + Math.max(0, trumpMs)
      )
    );
    timers.push(
      window.setTimeout(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        setPhase({ type: "done" });
        onComplete();
      }, dealDuration + Math.max(0, trumpMs) + Math.max(0, attackerMs))
    );

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [
    attackerMs,
    beatMs,
    onComplete,
    shouldReduceMotion,
    totalBeats,
    trumpMs
  ]);

  if (
    shouldReduceMotion ||
    totalBeats === 0 ||
    phase.type === "done"
  ) {
    return null;
  }

  if (phase.type === "deal") {
    const participantId =
      participants[phase.beatIndex % participants.length]!;

    return (
      <div
        className="match-intro match-intro--deal"
        data-testid="match-intro"
        aria-hidden="true"
      >
        <div
          className="match-intro__deal-card"
          data-testid="intro-deal-beat"
          data-participant-id={participantId}
        >
          <CardView back compact lang={lang} />
        </div>
      </div>
    );
  }

  if (phase.type === "trump") {
    return (
      <div
        className="match-intro match-intro--announcement"
        data-testid="match-intro"
        aria-hidden="true"
      >
        <div
          className="match-intro__announcement"
          data-testid="intro-trump"
        >
          <span>{t(lang, "trump")}</span>
          <strong>{SUIT_SYMBOLS[trumpCard.suit]}</strong>
        </div>
      </div>
    );
  }

  return (
    <div
      className="match-intro match-intro--announcement"
      data-testid="match-intro"
      aria-hidden="true"
    >
      <div
        className="match-intro__announcement"
        data-testid="intro-first-attacker"
      >
        <strong>
          {t(lang, "firstAttacker", {
            name: names[attackerId]
          })}
        </strong>
      </div>
    </div>
  );
}
