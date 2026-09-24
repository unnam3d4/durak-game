import type { ParticipantCount } from "../core/participants";
import type { OpponentSeatProfile } from "./opponent-profiles";

export type RankedMatchContextV1 = Readonly<{
  schemaVersion: 1;
  matchSeed: number;
  participantCount: ParticipantCount;
  playerRatingAtStart: number;
  opponents: readonly OpponentSeatProfile[];
  ratingEligible: boolean;
}>;
