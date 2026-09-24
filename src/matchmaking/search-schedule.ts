import type {
  ParticipantCount,
  ParticipantId
} from "../core/participants";
import { participantOrder } from "../core/participants";
import { createSeededRandom } from "../deck/random";

export type SearchReveal = Readonly<{
  participantId: Exclude<ParticipantId, "human">;
  revealAtMs: number;
}>;

export type SearchSchedule = Readonly<{
  reveals: readonly SearchReveal[];
  completeAtMs: number;
}>;

const MIN_SEARCH_MS = 1_500;
const MAX_SEARCH_MS = 9_500;
const MIN_REVEAL_GAP_MS = 250;

export function createSearchSchedule(
  seed: number,
  participantCount: ParticipantCount
): SearchSchedule {
  const random = createSeededRandom((seed ^ 0x6d2b79f5) >>> 0);
  const centered = (random() + random()) / 2;
  const completeAtMs = Math.round(
    MIN_SEARCH_MS + centered * (MAX_SEARCH_MS - MIN_SEARCH_MS)
  );
  const opponentIds = participantOrder(participantCount).slice(
    1
  ) as readonly Exclude<ParticipantId, "human">[];

  let previous = 0;
  const reveals = opponentIds.map((participantId, index) => {
    const slot = (index + 1) / (opponentIds.length + 1);
    const jitterWindow = Math.min(
      350,
      completeAtMs / (opponentIds.length + 1) / 3
    );
    const jitter = (random() * 2 - 1) * jitterWindow;
    const latest =
      completeAtMs -
      MIN_REVEAL_GAP_MS * (opponentIds.length - index - 1);
    const revealAtMs = Math.min(
      latest,
      Math.max(
        previous + MIN_REVEAL_GAP_MS,
        Math.round(completeAtMs * slot + jitter)
      )
    );
    previous = revealAtMs;
    return { participantId, revealAtMs };
  });

  return { reveals, completeAtMs };
}
