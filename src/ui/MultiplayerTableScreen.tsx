import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { CSSProperties } from "react";
import type { Card } from "../core/cards";
import type { MultiplayerGameState } from "../core/multiplayer-game-types";
import { toMultiplayerPlayerView } from "../core/multiplayer-public-view";
import type { ParticipantId } from "../core/participants";
import type {
  MatchResultSummary,
  RatingChangeSummary
} from "../profile/apply-match-result";
import type { OpponentSeatProfile } from "../matchmaking/opponent-profiles";
import {
  createBotController,
  type MultiplayerBotController
} from "../controllers/multiplayer-bot-controller";
import { computeBotDelayMs } from "../controllers/bot-delay";
import type { MultiplayerGameAction } from "../rules/multiplayer-legal-actions";
import { applyMultiplayerAction } from "../rules/multiplayer-reducer";
import { applyTechnicalLoss } from "../rules/multiplayer-technical-loss";
import { chooseMultiplayerTimeoutAction } from "../timer/multiplayer-timeout";
import {
  TURN_LIMIT_MS,
  createTurnDeadline,
  remainingTurnMs
} from "../timer/turn-timer";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  saveCurrentMultiplayerMatch
} from "../save/multiplayer-match-save";
import { CardView } from "./CardView";
import { PlayerSeat } from "./PlayerSeat";
import { OpponentSeats } from "./OpponentSeats";
import { ResultOverlay } from "./ResultOverlay";
import { Battlefield } from "./Battlefield";
import {
  HumanHand,
  type HumanCardDropPoint
} from "./HumanHand";
import { TurnTimer } from "./TurnTimer";
import {
  derivePresentationEvent,
  type MatchPresentationEvent
} from "./match-presentation-event";
import { useResultReveal } from "./use-result-reveal";
import { MatchIntroSequence } from "./MatchIntroSequence";
import { CardTransitLayer } from "./CardTransitLayer";
import {
  deriveCardTransitIntents,
  type CardTransitIntent
} from "./card-transit-event";
import {
  resolveCardDropAction,
  type CardDropTarget
} from "./card-drop-targets";
import {
  createSeatPresentations,
  DEFAULT_SEAT_NAMES,
  placementForParticipant
} from "./seat-presentation";
import "./table.css";
import "./multiplayer-table.css";

type DragPoint = HumanCardDropPoint;

type PendingCardTransit = Readonly<{
  key: string;
  intent: CardTransitIntent;
  cardId: string;
  card?: Card;
  sourceRect: DOMRect;
}>;

type ActiveCardTransit = PendingCardTransit &
  Readonly<{ targetRect: DOMRect }>;

function cardElement(cardId: string): HTMLElement | null {
  const cards = document.querySelectorAll<HTMLElement>("[data-card-id]");
  for (const element of cards) {
    if (element.dataset.cardId === cardId) return element;
  }
  return null;
}

function seatElement(participantId: ParticipantId): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-seat-participant-id="${participantId}"]`
  );
}

function opponentCardSourceRect(
  participantId: Exclude<ParticipantId, "human">
): DOMRect | null {
  const seat = seatElement(participantId);
  const card = seat?.querySelector<HTMLElement>(".opponent-hand .card");
  return (card ?? seat)?.getBoundingClientRect() ?? null;
}

function transitTargetRect(
  transit: PendingCardTransit
): DOMRect | null {
  if (transit.intent.type === "opponent-to-table") {
    return cardElement(transit.cardId)?.getBoundingClientRect() ?? null;
  }

  if (transit.intent.type === "table-to-discard") {
    return (
      document
        .querySelector<HTMLElement>("[data-discard-target]")
        ?.getBoundingClientRect() ?? null
    );
  }

  const seat = seatElement(transit.intent.participantId);
  const targetCard =
    transit.intent.participantId === "human"
      ? seat?.querySelector<HTMLElement>(".card:last-of-type")
      : seat?.querySelector<HTMLElement>(".opponent-hand .card");

  return (targetCard ?? seat)?.getBoundingClientRect() ?? null;
}

function cardFromPresentation(
  presentation: MatchPresentationEvent | null,
  cardId: string
): Card | undefined {
  return presentation?.cards.find((card) => card.id === cardId);
}

function pointInsideRect(point: DragPoint, rect: DOMRect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function dropTargetAtPoint(point: DragPoint): CardDropTarget | null {
  const attackTargets = document.querySelectorAll<HTMLElement>(
    "[data-drop-attack-id]"
  );
  for (const element of attackTargets) {
    const attackCardId = element.dataset.dropAttackId;
    if (
      attackCardId &&
      pointInsideRect(point, element.getBoundingClientRect())
    ) {
      return { type: "attack-card", attackCardId };
    }
  }

  const battlefield = document.querySelector<HTMLElement>(
    "[data-drop-battlefield]"
  );
  if (
    battlefield &&
    pointInsideRect(point, battlefield.getBoundingClientRect())
  ) {
    return { type: "battlefield" };
  }

  return null;
}

type Props = Readonly<{
  initialState: MultiplayerGameState;
  now?: () => number;
  animationMs?: number;
  botDelay?: (
    state: MultiplayerGameState,
    participantId: ParticipantId
  ) => number;
  opponentRatings?: readonly number[];
  opponentProfiles?: readonly OpponentSeatProfile[];
  playerNickname?: string;
  ratingChange?: RatingChangeSummary | null;
  showIntro?: boolean;
  onMatchComplete?: (result: MatchResultSummary) => void;
  onRestart?: () => void;
  onExitToMenu?: () => void;
}>;

function statusText(
  state: MultiplayerGameState,
  names: Readonly<Record<ParticipantId, string>>
): string {
  if (state.phase === "finished") return "Партия окончена";

  if (state.activePlayerId === "human") {
    if (state.phase === "defend") return "Отбейтесь или возьмите";
    if (state.phase === "throw-in") return "Подкиньте или пропустите";
    if (state.phase === "taking") return "Соперник берет — можно подкинуть";
    return "Ваш ход";
  }

  if (state.phase === "taking") {
    return `${names[state.defenderId]} берет — ${names[state.activePlayerId]} решает`;
  }
  if (state.phase === "defend") {
    return `${names[state.defenderId]} отбивается…`;
  }
  return `${names[state.activePlayerId]} думает…`;
}

function resultCopy(
  state: MultiplayerGameState,
  names: Readonly<Record<ParticipantId, string>>,
  humanTimedOut = false
) {
  if (humanTimedOut) {
    return {
      title: "Время вышло",
      text: "Техническое поражение: ход не был сделан за 20 секунд."
    };
  }

  const humanPlacement = placementForParticipant(state, "human");

  if (state.foolId === "human") {
    return {
      title: "Вы — дурак",
      text: "У соперников карты закончились раньше."
    };
  }

  if (humanPlacement) {
    return {
      title: humanPlacement,
      text:
        state.foolId === null
          ? "Все игроки избавились от карт."
          : `${names[state.foolId]} остался с картами.`
    };
  }

  if (state.foolId === null) {
    return {
      title: "Партия окончена",
      text: "Последнего игрока с картами нет."
    };
  }

  return {
    title: "Партия окончена",
    text: `${names[state.foolId]} остался с картами.`
  };
}

export function MultiplayerTableScreen({
  initialState,
  now = Date.now,
  animationMs = 320,
  botDelay,
  opponentRatings = [],
  opponentProfiles = [],
  playerNickname = DEFAULT_SEAT_NAMES.human,
  ratingChange = null,
  showIntro = false,
  onMatchComplete,
  onRestart,
  onExitToMenu
}: Props) {
  const initiallyHidden = document.visibilityState === "hidden";
  const [state, setState] = useState(initialState);
  const [introActive, setIntroActive] = useState(
    () => showIntro && initialState.phase !== "finished"
  );
  const [animating, setAnimating] = useState(false);
  const [presentationEvent, setPresentationEvent] =
    useState<MatchPresentationEvent | null>(null);
  const [pendingCardTransits, setPendingCardTransits] =
    useState<readonly PendingCardTransit[]>([]);
  const [activeCardTransits, setActiveCardTransits] =
    useState<readonly ActiveCardTransit[]>([]);
  const [hiddenTransitCardIds, setHiddenTransitCardIds] =
    useState<ReadonlySet<string>>(() => new Set());
  const [pausedByEnvironment, setPausedByEnvironment] = useState(
    initiallyHidden
  );
  const [deadline, setDeadline] = useState<number | null>(() =>
    initiallyHidden || showIntro ? null : createTurnDeadline(now())
  );
  const [remainingMs, setRemainingMs] = useState(TURN_LIMIT_MS);
  const [humanTimedOut, setHumanTimedOut] = useState(false);
  const [selectedAttackIds, setSelectedAttackIds] = useState<string[]>([]);
  const [selectedDefenseId, setSelectedDefenseId] = useState<string | null>(
    null
  );
  const visibilityPausedRef = useRef(initiallyHidden);
  const focusPausedRef = useRef(false);
  const lastTimedOutTurnRef = useRef<number | null>(null);
  const reportedResultRef = useRef(false);
  const animationTimer = useRef<number | null>(null);
  const botTimer = useRef<number | null>(null);
  const [botControllers] = useState<
    Record<Exclude<ParticipantId, "human">, MultiplayerBotController>
  >(() => {
    const skillFor = (
      participantId: Exclude<ParticipantId, "human">
    ) =>
      opponentProfiles.find(
        (profile) => profile.participantId === participantId
      )?.skill ?? "hard";

    return {
      bot: createBotController(
        Math.random,
        initialState.seed,
        "bot",
        skillFor("bot")
      ),
      bot2: createBotController(
        Math.random,
        initialState.seed,
        "bot2",
        skillFor("bot2")
      ),
      bot3: createBotController(
        Math.random,
        initialState.seed,
        "bot3",
        skillFor("bot3")
      )
    };
  });

  useEffect(() => {
    for (const participantId of state.participants) {
      if (participantId === "human") continue;
      botControllers[
        participantId as Exclude<ParticipantId, "human">
      ].observe(toMultiplayerPlayerView(state, participantId));
    }
  }, [state]);

  useEffect(() => {
    try {
      if (state.phase === "finished") {
        window.localStorage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
      } else {
        saveCurrentMultiplayerMatch(window.localStorage, state, now());
      }
    } catch {
      // Embedded browsers may restrict storage; the in-memory match remains playable.
    }
  }, [now, state]);

  useEffect(() => {
    if (
      state.phase !== "finished" ||
      reportedResultRef.current ||
      !onMatchComplete ||
      opponentRatings.length !== state.participants.length - 1
    ) {
      return;
    }

    const finishIndex = state.finishOrder.indexOf("human");
    const placement =
      finishIndex >= 0
        ? finishIndex + 1
        : state.foolId === "human"
          ? state.participants.length
          : Math.min(
              state.participants.length,
              state.finishOrder.length + 1
            );

    reportedResultRef.current = true;
    onMatchComplete({
      placement,
      participantCount: state.participants.length as 2 | 3 | 4,
      opponentRatings: [...opponentRatings],
      technicalLoss: humanTimedOut,
      surrendered: false
    });
  }, [
    humanTimedOut,
    onMatchComplete,
    opponentRatings,
    state.finishOrder,
    state.foolId,
    state.participants.length,
    state.phase
  ]);

  const seatPresentations = useMemo(
    () =>
      createSeatPresentations({
        state,
        playerNickname,
        opponentProfiles,
        interactionBlocked:
          introActive || animating || pausedByEnvironment
      }),
    [
      animating,
      introActive,
      opponentProfiles,
      pausedByEnvironment,
      playerNickname,
      state
    ]
  );

  const names = useMemo<Readonly<Record<ParticipantId, string>>>(() => {
    const next: Record<ParticipantId, string> = {
      ...DEFAULT_SEAT_NAMES
    };
    for (const seat of seatPresentations) {
      next[seat.participantId] = seat.nickname;
    }
    return next;
  }, [seatPresentations]);

  const humanView = useMemo(
    () => toMultiplayerPlayerView(state, "human"),
    [state]
  );

  const playableIds = useMemo(
    () =>
      new Set(
        humanView.legalActions.flatMap((action) => {
          if (
            action.type === "play-attack" ||
            action.type === "play-defense"
          ) {
            return [action.cardId];
          }
          if (
            action.type === "play-attack-set" ||
            action.type === "transfer"
          ) {
            return [...action.cardIds];
          }
          return [];
        })
      ),
    [humanView]
  );

  const attackSetActions = useMemo(
    () =>
      humanView.legalActions.filter(
        (
          action
        ): action is Extract<
          MultiplayerGameAction,
          { type: "play-attack-set" }
        > => action.type === "play-attack-set"
      ),
    [humanView]
  );

  const transferActions = useMemo(
    () =>
      humanView.legalActions.filter(
        (
          action
        ): action is Extract<
          MultiplayerGameAction,
          { type: "transfer" }
        > => action.type === "transfer"
      ),
    [humanView]
  );

  const defenseActions = useMemo(
    () =>
      humanView.legalActions.filter(
        (
          action
        ): action is Extract<
          MultiplayerGameAction,
          { type: "play-defense" }
        > => action.type === "play-defense"
      ),
    [humanView]
  );

  const selectedDefenseActions = useMemo(
    () =>
      selectedDefenseId === null
        ? []
        : defenseActions.filter(
            (action) => action.cardId === selectedDefenseId
          ),
    [defenseActions, selectedDefenseId]
  );

  const targetableAttackIds = useMemo(
    () =>
      new Set(
        selectedDefenseActions.map(
          (action) => action.attackCardId
        )
      ),
    [selectedDefenseActions]
  );

  const selectedAttackAction = useMemo(() => {
    if (selectedAttackIds.length === 0) return undefined;

    const selected = new Set(selectedAttackIds);

    if (state.phase === "defend") {
      return transferActions.find(
        (action) =>
          action.cardIds.length === selected.size &&
          action.cardIds.every((id) => selected.has(id))
      );
    }

    if (selectedAttackIds.length === 1) {
      return humanView.legalActions.find(
        (action) =>
          action.type === "play-attack" &&
          action.cardId === selectedAttackIds[0]
      );
    }

    return attackSetActions.find(
      (action) =>
        action.cardIds.length === selected.size &&
        action.cardIds.every((id) => selected.has(id))
    );
  }, [
    attackSetActions,
    humanView,
    selectedAttackIds,
    state.phase,
    transferActions
  ]);

  useLayoutEffect(() => {
    if (pendingCardTransits.length === 0) return;

    const active = pendingCardTransits.flatMap((transit) => {
      const targetRect = transitTargetRect(transit);
      return targetRect ? [{ ...transit, targetRect }] : [];
    });

    setActiveCardTransits(active);
    setPendingCardTransits([]);

    const arrivingIds = new Set(
      active
        .filter(
          (transit) =>
            transit.intent.type === "opponent-to-table"
        )
        .map((transit) => transit.cardId)
    );
    setHiddenTransitCardIds(arrivingIds);
  }, [pendingCardTransits, state.turnNumber]);

  const startClock = useCallback(() => {
    setRemainingMs(TURN_LIMIT_MS);
    if (
      visibilityPausedRef.current ||
      focusPausedRef.current ||
      document.visibilityState === "hidden"
    ) {
      setPausedByEnvironment(true);
      setDeadline(null);
      return;
    }

    setPausedByEnvironment(false);
    setDeadline(createTurnDeadline(now()));
  }, [now]);

  const commitAction = useCallback(
    (action: MultiplayerGameAction) => {
      const next = applyMultiplayerAction(state, action);
      const presentation = derivePresentationEvent(
        state,
        action,
        next
      );
      const intents = deriveCardTransitIntents(
        state,
        action,
        next,
        presentation
      );

      const pending: PendingCardTransit[] = [];
      let sequence = 0;

      for (const intent of intents) {
        for (const cardId of intent.cardIds) {
          const sourceRect =
            intent.type === "opponent-to-table"
              ? opponentCardSourceRect(intent.participantId)
              : cardElement(cardId)?.getBoundingClientRect() ?? null;

          if (!sourceRect) continue;

          pending.push({
            key: `${next.turnNumber}-${sequence++}-${cardId}`,
            intent,
            cardId,
            card: cardFromPresentation(presentation, cardId),
            sourceRect
          });
        }
      }

      setPendingCardTransits(pending);
      setHiddenTransitCardIds(
        new Set(
          pending
            .filter(
              (transit) =>
                transit.intent.type === "opponent-to-table"
            )
            .map((transit) => transit.cardId)
        )
      );
      setPresentationEvent(presentation);
      setState(next);
      setAnimating(true);
      setDeadline(null);
      setRemainingMs(TURN_LIMIT_MS);

      if (animationTimer.current !== null) {
        window.clearTimeout(animationTimer.current);
      }
      animationTimer.current = window.setTimeout(() => {
        setPendingCardTransits([]);
        setActiveCardTransits([]);
        setHiddenTransitCardIds(new Set());
        setPresentationEvent(null);
        setAnimating(false);
        if (next.phase !== "finished") {
          startClock();
        }
      }, Math.max(0, animationMs));
    },
    [animationMs, startClock, state]
  );

  useEffect(() => {
    if (
      state.phase === "finished" ||
      introActive ||
      animating ||
      pausedByEnvironment ||
      deadline === null
    ) {
      return;
    }

    const tick = () => {
      const left = remainingTurnMs(deadline, now());
      setRemainingMs(left);

      if (
        left <= 0 &&
        lastTimedOutTurnRef.current !== state.turnNumber
      ) {
        lastTimedOutTurnRef.current = state.turnNumber;
        setDeadline(null);

        if (state.activePlayerId === "human") {
          setRemainingMs(0);
          setHumanTimedOut(true);
          setState((current) => applyTechnicalLoss(current, "human"));
          return;
        }

        const fallback = chooseMultiplayerTimeoutAction(state);
        if (fallback) commitAction(fallback);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [
    animating,
    commitAction,
    introActive,
    deadline,
    now,
    pausedByEnvironment,
    state
  ]);

  useEffect(() => {
    if (
      state.phase === "finished" ||
      state.activePlayerId === "human" ||
      introActive ||
      animating ||
      pausedByEnvironment
    ) {
      return;
    }

    const active = state.activePlayerId;
    const view = toMultiplayerPlayerView(state, active);
    if (view.legalActions.length === 0) return;

    const controller =
      botControllers[
        active as Exclude<ParticipantId, "human">
      ];
    const delay = Math.min(
      15_000,
      Math.max(
        0,
        botDelay
          ? botDelay(state, active)
          : computeBotDelayMs(
              {
                legalActionCount: view.legalActions.length,
                complexity:
                  state.phase === "defend"
                    ? 0.58
                    : state.phase === "taking"
                      ? 0.48
                      : state.phase === "throw-in"
                        ? 0.42
                        : 0.2,
                reactionSpeed: controller.personality.reactionSpeed
              },
              Math.random
            )
      )
    );

    botTimer.current = window.setTimeout(async () => {
      const action = await controller.requestAction(view);
      commitAction(action);
    }, delay);

    return () => {
      if (botTimer.current !== null) {
        window.clearTimeout(botTimer.current);
      }
    };
  }, [
    animating,
    botControllers,
    botDelay,
    commitAction,
    introActive,
    pausedByEnvironment,
    state
  ]);

  useEffect(() => {
    const pauseClock = () => {
      setPausedByEnvironment(true);
      if (deadline !== null) {
        setRemainingMs(remainingTurnMs(deadline, now()));
        setDeadline(null);
      }
    };

    const maybeResumeClock = () => {
      if (
        visibilityPausedRef.current ||
        focusPausedRef.current ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      setPausedByEnvironment(false);
      if (
        state.phase !== "finished" &&
        !introActive &&
        !animating &&
        deadline === null
      ) {
        setDeadline(now() + remainingMs);
      }
    };

    const onVisibilityChange = () => {
      visibilityPausedRef.current =
        document.visibilityState === "hidden";
      if (visibilityPausedRef.current) {
        pauseClock();
        return;
      }
      maybeResumeClock();
    };

    const onBlur = () => {
      focusPausedRef.current = true;
      pauseClock();
    };

    const onFocus = () => {
      focusPausedRef.current = false;
      maybeResumeClock();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    animating,
    deadline,
    introActive,
    now,
    remainingMs,
    state.phase
  ]);

  useEffect(
    () => () => {
      if (animationTimer.current !== null) {
        window.clearTimeout(animationTimer.current);
      }
      if (botTimer.current !== null) {
        window.clearTimeout(botTimer.current);
      }
    },
    []
  );

  useEffect(() => {
    const canSelectAttack =
      (state.phase === "attack" && state.table.length === 0) ||
      state.phase === "throw-in" ||
      state.phase === "taking";
    const canSelectTransfer =
      state.phase === "defend" && transferActions.length > 0;

    if (
      (!canSelectAttack && !canSelectTransfer) ||
      state.activePlayerId !== "human"
    ) {
      setSelectedAttackIds([]);
    }
    if (state.phase !== "defend" || state.activePlayerId !== "human") {
      setSelectedDefenseId(null);
    }
  }, [
    state.activePlayerId,
    state.phase,
    state.table.length,
    transferActions.length
  ]);

  const playHumanCard = (card: Card) => {
    if (
      introActive ||
      animating ||
      pausedByEnvironment ||
      state.phase === "finished" ||
      state.activePlayerId !== "human"
    ) {
      return;
    }

    if (state.phase === "defend") {
      const transfersForCard = transferActions.filter(
        (action) => action.cardIds.includes(card.id)
      );

      if (transfersForCard.length > 0) {
        if (selectedAttackIds.includes(card.id)) {
          setSelectedAttackIds((current) =>
            current.filter((id) => id !== card.id)
          );
          return;
        }

        const nextIds = [...selectedAttackIds, card.id];
        const canExtendTransfer = transferActions.some(
          (action) =>
            action.cardIds.length >= nextIds.length &&
            nextIds.every((id) => action.cardIds.includes(id))
        );

        setSelectedAttackIds(
          canExtendTransfer ? nextIds : [card.id]
        );
        setSelectedDefenseId(null);
        return;
      }

      const defensesForCard = defenseActions.filter(
        (action) => action.cardId === card.id
      );
      if (defensesForCard.length === 0) return;

      if (defensesForCard.length === 1) {
        setSelectedDefenseId(null);
        commitAction(defensesForCard[0]!);
        return;
      }

      setSelectedDefenseId((current) =>
        current === card.id ? null : card.id
      );
      return;
    }

    const canSelectAttack =
      (state.phase === "attack" && state.table.length === 0) ||
      state.phase === "throw-in" ||
      state.phase === "taking";

    if (canSelectAttack) {
      if (selectedAttackIds.includes(card.id)) {
        setSelectedAttackIds((current) =>
          current.filter((id) => id !== card.id)
        );
        return;
      }

      const canStartSet = attackSetActions.some((action) =>
        action.cardIds.includes(card.id)
      );
      if (selectedAttackIds.length === 0 && canStartSet) {
        setSelectedAttackIds([card.id]);
        return;
      }

      if (selectedAttackIds.length > 0) {
        const nextIds = [...selectedAttackIds, card.id];
        const canExtendSet = attackSetActions.some(
          (action) =>
            action.cardIds.length >= nextIds.length &&
            nextIds.every((id) => action.cardIds.includes(id))
        );
        if (canExtendSet) {
          setSelectedAttackIds(nextIds);
          return;
        }

        if (canStartSet) {
          setSelectedAttackIds([card.id]);
          return;
        }

        setSelectedAttackIds([]);
      }
    }

    const action = humanView.legalActions.find(
      (candidate) =>
        candidate.type === "play-attack" &&
        candidate.cardId === card.id
    );
    if (action) commitAction(action);
  };

  const dropHumanCard = useCallback(
    (cardId: string, point: DragPoint) => {
      if (
        introActive ||
        animating ||
        pausedByEnvironment ||
        state.phase === "finished" ||
        state.activePlayerId !== "human"
      ) {
        return;
      }

      const target = dropTargetAtPoint(point);
      if (!target) return;

      const action = resolveCardDropAction(
        humanView,
        cardId,
        target
      );
      if (action) commitAction(action);
    },
    [
      animating,
      commitAction,
      humanView,
      introActive,
      pausedByEnvironment,
      state.activePlayerId,
      state.phase
    ]
  );

  const commitSelectedAttack = () => {
    if (!selectedAttackAction || animating || pausedByEnvironment) return;
    setSelectedAttackIds([]);
    commitAction(selectedAttackAction);
  };

  const defendWithSelectedTransferCard = () => {
    if (
      selectedAttackIds.length !== 1 ||
      animating ||
      pausedByEnvironment
    ) {
      return;
    }

    const cardId = selectedAttackIds[0]!;
    const defenses = defenseActions.filter(
      (action) => action.cardId === cardId
    );
    if (defenses.length === 0) return;

    setSelectedAttackIds([]);
    if (defenses.length === 1) {
      commitAction(defenses[0]!);
      return;
    }

    setSelectedDefenseId(cardId);
  };

  const commitDefenseTarget = (attackCardId: string) => {
    if (
      selectedDefenseId === null ||
      animating ||
      pausedByEnvironment
    ) {
      return;
    }

    const action = selectedDefenseActions.find(
      (candidate) => candidate.attackCardId === attackCardId
    );
    if (!action) return;

    setSelectedDefenseId(null);
    commitAction(action);
  };

  const take = humanView.legalActions.find(
    (action) => action.type === "take"
  );
  const pass = humanView.legalActions.find(
    (action) => action.type === "pass-throw-in"
  );
  const result = resultCopy(state, names, humanTimedOut);
  const resultVisible = useResultReveal({
    phase: state.phase,
    animating,
    presentationActive: presentationEvent !== null
  });
  const opponents = seatPresentations.filter(
    (seat) => seat.participantId !== "human"
  );

  const humanPlacement = placementForParticipant(state, "human");

  const selectedAttackLabel =
    state.phase === "defend"
      ? selectedAttackIds.length === 1
        ? "Перевести: 1 карта"
        : selectedAttackIds.length >= 2 && selectedAttackIds.length <= 4
          ? `Перевести: ${selectedAttackIds.length} карты`
          : `Перевести: ${selectedAttackIds.length} карт`
      : selectedAttackIds.length === 1
        ? "Ход: 1 карта"
        : selectedAttackIds.length >= 2 && selectedAttackIds.length <= 4
          ? `Ход: ${selectedAttackIds.length} карты`
          : `Ход: ${selectedAttackIds.length} карт`;

  const selectedTransferCanDefend =
    state.phase === "defend" &&
    selectedAttackIds.length === 1 &&
    defenseActions.some(
      (action) => action.cardId === selectedAttackIds[0]
    );

  return (
    <main className="game-shell">
      <section className="game-frame multiplayer-frame">
        <header className="game-header">
          <div>
            <span className="eyebrow">Классическая карточная игра</span>
            <h1>Дурак</h1>
          </div>
          <div className="header-badges">
            <span>
              {state.variant === "perevodnoy" ? "Переводной" : "Подкидной"}
            </span>
            <span>{state.participants.length} игрока</span>
          </div>
        </header>

        <div className="felt multiplayer-felt">
          <OpponentSeats
            seats={seatPresentations}
            finishOrder={state.finishOrder}
            foolId={state.foolId}
            finished={state.phase === "finished"}
          />

          <div className="multiplayer-status-row">
            <div className="status-pill" aria-live="polite">
              <i
                className={
                  state.activePlayerId === "human"
                    ? "status-dot status-dot--human"
                    : "status-dot"
                }
              />
              {introActive
                ? "Раздаём карты…"
                : animating
                  ? "Карты на столе…"
                  : statusText(state, names)}
            </div>
            <TurnTimer
              remainingMs={remainingMs}
              paused={
                introActive ||
                animating ||
                pausedByEnvironment ||
                state.phase === "finished"
              }
            />
          </div>

          <Battlefield
            talonCount={state.talon.length}
            trumpCard={state.trumpCard}
            table={state.table}
            status={statusText(state, names)}
            targetableAttackIds={targetableAttackIds}
            interactionBlocked={
              introActive || animating || pausedByEnvironment
            }
            hiddenCardIds={hiddenTransitCardIds}
            onAttackTarget={commitDefenseTarget}
          />

          <section className="human-area">
            <div className="human-toolbar">
              <div className="human-seat-wrap">
                <PlayerSeat
                  name={names.human}
                  cardCount={state.hands.human.length}
                  active={
                    state.activePlayerId === "human" &&
                    !introActive &&
                    !animating &&
                    !pausedByEnvironment
                  }
                />
                {humanPlacement && state.phase !== "finished" && (
                  <span className="human-finish-label">
                    Вы вышли: {humanPlacement}
                  </span>
                )}
              </div>
              <div className="action-row">
                {selectedAttackIds.length > 0 &&
                  state.activePlayerId === "human" &&
                  (state.phase === "attack" ||
                    state.phase === "throw-in" ||
                    state.phase === "taking" ||
                    state.phase === "defend") && (
                    <button
                      className="table-action"
                      type="button"
                      disabled={
                        animating ||
                        pausedByEnvironment ||
                        !selectedAttackAction
                      }
                      onClick={commitSelectedAttack}
                    >
                      {selectedAttackLabel}
                    </button>
                  )}
                {selectedTransferCanDefend &&
                  state.activePlayerId === "human" && (
                    <button
                      className="table-action"
                      type="button"
                      disabled={animating || pausedByEnvironment}
                      onClick={defendWithSelectedTransferCard}
                    >
                      Отбить выбранной
                    </button>
                  )}
                {take && state.activePlayerId === "human" && (
                  <button
                    className="table-action table-action--danger"
                    type="button"
                    disabled={animating || pausedByEnvironment}
                    onClick={() => commitAction(take)}
                  >
                    Беру
                  </button>
                )}
                {pass && state.activePlayerId === "human" && (
                  <button
                    className="table-action"
                    type="button"
                    disabled={animating || pausedByEnvironment}
                    onClick={() => commitAction(pass)}
                  >
                    Пас
                  </button>
                )}
              </div>
            </div>

            <HumanHand
              cards={state.hands.human}
              interactive={
                state.activePlayerId === "human" &&
                !introActive &&
                !animating &&
                !pausedByEnvironment
              }
              playableIds={playableIds}
              selectedAttackIds={selectedAttackIds}
              selectedDefenseId={selectedDefenseId}
              onTapCard={playHumanCard}
              onDropCard={dropHumanCard}
            />
          </section>

          {introActive ? (
            <MatchIntroSequence
              participants={state.participants}
              attackerId={state.attackerId}
              trumpCard={state.trumpCard}
              names={names}
              onComplete={() => {
                setIntroActive(false);
                startClock();
              }}
            />
          ) : null}

          {activeCardTransits.map((transit) => (
            <CardTransitLayer
              key={transit.key}
              sourceRect={transit.sourceRect}
              targetRect={transit.targetRect}
              durationMs={animationMs}
              onComplete={() => {
                setActiveCardTransits((current) =>
                  current.filter((item) => item.key !== transit.key)
                );
                if (transit.intent.type === "opponent-to-table") {
                  setHiddenTransitCardIds((current) => {
                    const next = new Set(current);
                    next.delete(transit.cardId);
                    return next;
                  });
                }
              }}
            >
              {transit.intent.type === "opponent-to-table" ? (
                <CardView back compact />
              ) : transit.card ? (
                <CardView card={transit.card} compact />
              ) : null}
            </CardTransitLayer>
          ))}

          {presentationEvent ? (
            <div
              className={`bout-presentation-layer bout-presentation-layer--${presentationEvent.type}`}
              aria-hidden="true"
              style={{
                "--bout-animation-ms": `${Math.max(0, animationMs)}ms`
              } as CSSProperties}
            >
              {presentationEvent.cards.map((card) => (
                <CardView
                  key={card.id}
                  card={card}
                  compact
                  style={
                    activeCardTransits.some(
                      (transit) => transit.cardId === card.id
                    ) ||
                    pendingCardTransits.some(
                      (transit) => transit.cardId === card.id
                    )
                      ? { visibility: "hidden" }
                      : undefined
                  }
                  testId={`presentation-card-${card.id}`}
                />
              ))}
            </div>
          ) : null}

          {resultVisible ? (
            <ResultOverlay
              title={result.title}
              text={result.text}
              ratingChange={ratingChange}
              onRestart={onRestart}
              onExitToMenu={onExitToMenu}
            />
          ) : null}
        </div>

        <footer className="game-footer">
          <span>36 карт</span>
          <span>{state.participants.length} игрока</span>
          <span>20 сек на ход</span>
          <span>Честная раздача</span>
        </footer>
      </section>
    </main>
  );
}
