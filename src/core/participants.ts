export type ParticipantId = "human" | "bot" | "bot2" | "bot3";
export type ParticipantCount = 2 | 3 | 4;

const ORDERS: Readonly<Record<ParticipantCount, readonly ParticipantId[]>> = {
  2: ["human", "bot"],
  3: ["human", "bot", "bot2"],
  4: ["human", "bot", "bot2", "bot3"]
};

export function participantOrder(
  count: ParticipantCount
): readonly ParticipantId[] {
  return ORDERS[count];
}

export function nextEligibleParticipant(
  order: readonly ParticipantId[],
  from: ParticipantId,
  eligible: ReadonlySet<ParticipantId> = new Set(order)
): ParticipantId | undefined {
  const start = order.indexOf(from);
  if (start < 0) throw new Error(`Unknown participant: ${from}`);

  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidate = order[(start + offset) % order.length]!;
    if (eligible.has(candidate)) return candidate;
  }

  return undefined;
}

/**
 * All players allowed to add attack cards in a bout, in deterministic order:
 * the primary attacker first, then every other active participant except the
 * defender while walking clockwise around the table.
 */
export function attackersForBout(
  order: readonly ParticipantId[],
  attackerId: ParticipantId,
  defenderId: ParticipantId,
  eligible: ReadonlySet<ParticipantId> = new Set(order)
): readonly ParticipantId[] {
  if (attackerId === defenderId) {
    throw new Error("Attacker and defender must be different participants");
  }

  const start = order.indexOf(attackerId);
  if (start < 0) throw new Error(`Unknown attacker: ${attackerId}`);
  if (!order.includes(defenderId)) {
    throw new Error(`Unknown defender: ${defenderId}`);
  }

  const result: ParticipantId[] = [];
  for (let offset = 0; offset < order.length; offset += 1) {
    const candidate = order[(start + offset) % order.length]!;
    if (candidate === defenderId || !eligible.has(candidate)) continue;
    result.push(candidate);
  }
  return result;
}

/**
 * Cards are replenished starting with the main attacker. Other attackers draw
 * next, while the defender always draws last.
 */
export function refillOrderForBout(
  order: readonly ParticipantId[],
  attackerId: ParticipantId,
  defenderId: ParticipantId,
  eligible: ReadonlySet<ParticipantId> = new Set(order)
): readonly ParticipantId[] {
  const attackers = attackersForBout(
    order,
    attackerId,
    defenderId,
    eligible
  );
  return eligible.has(defenderId)
    ? [...attackers, defenderId]
    : attackers;
}

export function nextAttackerAfterSuccessfulDefense(
  defenderId: ParticipantId
): ParticipantId {
  return defenderId;
}

/**
 * A defender who takes skips their next attacking turn. The next eligible
 * participant clockwise from that defender becomes the next attacker.
 */
export function nextAttackerAfterTake(
  order: readonly ParticipantId[],
  defenderId: ParticipantId,
  eligible: ReadonlySet<ParticipantId> = new Set(order)
): ParticipantId | undefined {
  return nextEligibleParticipant(order, defenderId, eligible);
}
