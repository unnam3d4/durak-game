export const TURN_LIMIT_MS = 20_000;

export function createTurnDeadline(startedAtMs: number): number {
  return startedAtMs + TURN_LIMIT_MS;
}

export function remainingTurnMs(deadlineMs: number, nowMs: number): number {
  return Math.max(0, deadlineMs - nowMs);
}
