export type RatingResultInput = Readonly<{
  playerRating: number;
  placement: number;
  participantCount: 2 | 3 | 4;
  opponentRatings: readonly number[];
}>;

const K_BY_PARTICIPANTS = {
  2: 24,
  3: 18,
  4: 14
} as const;

const MIN_DELTA = -32;
const MAX_DELTA = 32;

function expectedScore(
  playerRating: number,
  opponentRating: number
): number {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

function validateInput(input: RatingResultInput): void {
  if (
    !Number.isFinite(input.playerRating) ||
    input.playerRating < 0
  ) {
    throw new Error("Invalid player rating");
  }
  if (
    !Number.isInteger(input.placement) ||
    input.placement < 1 ||
    input.placement > input.participantCount
  ) {
    throw new Error("Invalid placement");
  }
  if (
    input.opponentRatings.length !== input.participantCount - 1 ||
    input.opponentRatings.some(
      (rating) => !Number.isFinite(rating) || rating < 0
    )
  ) {
    throw new Error("Invalid opponent ratings");
  }
}

export function calculateRatingDelta(
  input: RatingResultInput
): number {
  validateInput(input);

  const k = K_BY_PARTICIPANTS[input.participantCount];
  const wins = input.participantCount - input.placement;
  const opponents = [...input.opponentRatings].sort((a, b) => a - b);

  const raw = opponents.reduce((sum, opponentRating, index) => {
    const actual = index < wins ? 1 : 0;
    const expected = expectedScore(
      input.playerRating,
      opponentRating
    );
    return sum + k * (actual - expected);
  }, 0);

  return Math.max(
    MIN_DELTA,
    Math.min(MAX_DELTA, Math.round(raw))
  );
}
