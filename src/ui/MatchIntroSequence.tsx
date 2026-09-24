import { useEffect, useRef, useState } from "react";
import type { Card } from "../core/cards";
import type { ParticipantId } from "../core/participants";
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
}>;

export function MatchIntroSequence({
  participants,
  attackerId,
  trumpCard,
  names,
  beatMs = 85,
  trumpMs = 320,
  attackerMs = 520,
  reducedMotion = false,
  onComplete
}: Props) {
  const [phase, setPhase] = useState<Phase>({
    type: "deal",
    beatIndex: 0
  });
  const completedRef = useRef(false);
  const totalBeats = participants.length * 6;

  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    if (reducedMotion || participants.length === 0) {
      complete();
      return;
    }

    if (phase.type === "deal") {
      const timer = window.setTimeout(() => {
        if (phase.beatIndex + 1 < totalBeats) {
          setPhase({
            type: "deal",
            beatIndex: phase.beatIndex + 1
          });
        } else {
          setPhase({ type: "trump" });
        }
      }, Math.max(0, beatMs));
      return () => window.clearTimeout(timer);
    }

    if (phase.type === "trump") {
      const timer = window.setTimeout(
        () => setPhase({ type: "attacker" }),
        Math.max(0, trumpMs)
      );
      return () => window.clearTimeout(timer);
    }

    if (phase.type === "attacker") {
      const timer = window.setTimeout(() => {
        setPhase({ type: "done" });
        complete();
      }, Math.max(0, attackerMs));
      return () => window.clearTimeout(timer);
    }
  }, [
    attackerMs,
    beatMs,
    participants.length,
    phase,
    reducedMotion,
    totalBeats,
    trumpMs
  ]);

  if (
    reducedMotion ||
    participants.length === 0 ||
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
          <CardView back compact />
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
        <div className="match-intro__announcement" data-testid="intro-trump">
          <span>Козырь</span>
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
        <strong>{names[attackerId]} ходит первым</strong>
      </div>
    </div>
  );
}
