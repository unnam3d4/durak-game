import type { MultiplayerPublicView } from "../core/multiplayer-public-view";
import type { RandomSource } from "../deck/random";
import type { BotPersonality } from "./multiplayer-bot-personality";

export function shouldBotSurrender(
  view: MultiplayerPublicView,
  personality: BotPersonality,
  random: RandomSource
): boolean {
  if (view.phase !== "attack" || view.table.length !== 0) return false;
  if (view.activePlayerId !== view.viewerId) return false;
  if (view.turnNumber < 20 || view.talonCount !== 0) return false;
  if (view.ownHand.length < 4) return false;

  const hasOpponentNearOut = view.participants.some(
    (participantId) =>
      participantId !== view.viewerId &&
      !view.finishOrder.includes(participantId) &&
      view.cardCounts[participantId] <= 1
  );
  if (!hasOpponentNearOut) return false;

  const chance = Math.min(
    0.0015,
    Math.max(0, personality.quitTendency)
  );
  return random() < chance;
}
