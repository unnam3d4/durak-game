import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Card } from "../core/cards";
import type { GameState } from "../core/game-types";
import { toPlayerView } from "../core/public-view";
import { BotController } from "../controllers/bot-controller";
import { computeBotDelayMs } from "../controllers/bot-delay";
import type { GameAction } from "../rules/legal-actions";
import { applyAction, applyTimeoutLoss } from "../rules/reducer";
import { CURRENT_MATCH_KEY, saveCurrentMatch } from "../save/match-save";
import { TURN_LIMIT_MS, createTurnDeadline, remainingTurnMs } from "../timer/turn-timer";
import { CardView } from "./CardView";
import { PlayerSeat } from "./PlayerSeat";
import { TurnTimer } from "./TurnTimer";
import "./table.css";

const SUIT_SYMBOLS: Readonly<Record<Card["suit"], string>> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

type Props = Readonly<{
  initialState: GameState;
  now?: () => number;
  animationMs?: number;
  botDelay?: (state: GameState) => number;
  onRestart?: () => void;
}>;

function statusText(state: GameState): string {
  if (state.phase === "finished") return "Партия окончена";
  if (state.phase === "taking") return "Можно подкинуть";
  if (state.activePlayerId === "human") {
    if (state.phase === "defend") return "Отбейтесь или возьмите";
    if (state.phase === "throw-in") return "Подкиньте или завершите";
    return "Ваш ход";
  }
  return state.phase === "defend" ? "Соперник отбивается…" : "Соперник думает…";
}

function resultCopy(state: GameState) {
  const result = state.result;
  if (!result) return { title: "Партия окончена", text: "" };
  if (result.kind === "draw") return { title: "Ничья", text: "Карты закончились одновременно." };
  if (result.kind === "technical-loss") {
    return result.loser === "human"
      ? { title: "Время вышло", text: "Техническое поражение." }
      : { title: "Победа", text: "Соперник не успел сделать ход." };
  }
  return result.winner === "human"
    ? { title: "Победа!", text: "У вас не осталось карт." }
    : { title: "Поражение", text: "Последние карты остались у вас." };
}

function persist(state: GameState, nowMs: number) {
  try {
    if (state.phase === "finished") window.localStorage.removeItem(CURRENT_MATCH_KEY);
    else saveCurrentMatch(window.localStorage, state, nowMs);
  } catch {
    // Some embedded browsers can restrict storage. The match still remains playable.
  }
}

export function TableScreen({
  initialState,
  now = Date.now,
  animationMs = 320,
  botDelay,
  onRestart
}: Props) {
  const initiallyHidden = document.visibilityState === "hidden";
  const [state, setState] = useState(initialState);
  const [animating, setAnimating] = useState(false);
  const [pausedByEnvironment, setPausedByEnvironment] = useState(initiallyHidden);
  const [deadline, setDeadline] = useState<number | null>(() =>
    initiallyHidden ? null : createTurnDeadline(now())
  );
  const [remainingMs, setRemainingMs] = useState(TURN_LIMIT_MS);
  const [selectedAttackIds, setSelectedAttackIds] = useState<string[]>([]);
  const visibilityPausedRef = useRef(initiallyHidden);
  const focusPausedRef = useRef(false);
  const animationTimer = useRef<number | null>(null);
  const botTimer = useRef<number | null>(null);
  const bot = useRef(new BotController());

  const humanView = useMemo(() => toPlayerView(state, "human"), [state]);
  const playableIds = useMemo(() => new Set(
    humanView.legalActions
      .filter((action): action is Extract<GameAction, { type: "play-attack" | "play-defense" }> =>
        action.type === "play-attack" || action.type === "play-defense")
      .map((action) => action.cardId)
  ), [humanView]);

  const attackSetActions = useMemo(
    () => humanView.legalActions.filter(
      (action): action is Extract<GameAction, { type: "play-attack-set" }> =>
        action.type === "play-attack-set"
    ),
    [humanView]
  );

  const selectedAttackAction = useMemo(() => {
    if (selectedAttackIds.length === 0) return undefined;
    if (selectedAttackIds.length === 1) {
      return humanView.legalActions.find(
        (action) =>
          action.type === "play-attack" &&
          action.cardId === selectedAttackIds[0]
      );
    }

    const selected = new Set(selectedAttackIds);
    return attackSetActions.find(
      (action) =>
        action.cardIds.length === selected.size &&
        action.cardIds.every((id) => selected.has(id))
    );
  }, [humanView, attackSetActions, selectedAttackIds]);

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

  const commitAction = useCallback((action: GameAction) => {
    setState((current) => applyAction(current, action));
    setAnimating(true);
    setDeadline(null);
    setRemainingMs(TURN_LIMIT_MS);
    if (animationTimer.current !== null) window.clearTimeout(animationTimer.current);
    animationTimer.current = window.setTimeout(() => {
      setAnimating(false);
      startClock();
    }, Math.max(0, animationMs));
  }, [animationMs, startClock]);

  useEffect(() => persist(state, now()), [state, now]);

  useEffect(() => {
    if (
      state.phase === "finished" ||
      animating ||
      pausedByEnvironment ||
      deadline === null
    ) return;
    const tick = () => {
      const left = remainingTurnMs(deadline, now());
      setRemainingMs(left);
      if (left <= 0) {
        setDeadline(null);
        setState((current) => current.phase === "finished" ? current : applyTimeoutLoss(current, current.activePlayerId));
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [animating, deadline, now, pausedByEnvironment, state.phase]);

  useEffect(() => {
    if (
      state.phase === "finished" ||
      state.activePlayerId !== "bot" ||
      animating ||
      pausedByEnvironment
    ) return;
    const view = toPlayerView(state, "bot");
    if (view.legalActions.length === 0) return;

    const delay = Math.min(15_000, Math.max(0, botDelay
      ? botDelay(state)
      : computeBotDelayMs({
          legalActionCount: view.legalActions.length,
          complexity: state.phase === "defend" ? 0.55 : state.phase === "throw-in" ? 0.42 : 0.18
        }, Math.random)));

    botTimer.current = window.setTimeout(async () => {
      const action = await bot.current.requestAction(view);
      commitAction(action);
    }, delay);
    return () => {
      if (botTimer.current !== null) window.clearTimeout(botTimer.current);
    };
  }, [animating, botDelay, commitAction, pausedByEnvironment, state]);

  useEffect(() => () => {
    if (animationTimer.current !== null) window.clearTimeout(animationTimer.current);
    if (botTimer.current !== null) window.clearTimeout(botTimer.current);
  }, []);

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
        !animating &&
        deadline === null
      ) {
        setDeadline(now() + remainingMs);
      }
    };

    const onVisibilityChange = () => {
      visibilityPausedRef.current = document.visibilityState === "hidden";
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
  }, [animating, deadline, now, remainingMs, state.phase]);

  useEffect(() => {
    const canSelectAttackSet =
      (state.phase === "attack" && state.table.length === 0) ||
      state.phase === "throw-in" ||
      state.phase === "taking";
    if (!canSelectAttackSet || state.activePlayerId !== "human") {
      setSelectedAttackIds([]);
    }
  }, [state.activePlayerId, state.phase, state.table.length]);

  const playHumanCard = (card: Card) => {
    if (animating || state.phase === "finished" || state.activePlayerId !== "human") return;

    const canSelectAttackSet =
      (state.phase === "attack" && state.table.length === 0) ||
      state.phase === "throw-in" ||
      state.phase === "taking";
    if (canSelectAttackSet) {
      if (selectedAttackIds.includes(card.id)) {
        setSelectedAttackIds((current) => current.filter((id) => id !== card.id));
        return;
      }

      const canStartSet = attackSetActions.some((action) => action.cardIds.includes(card.id));
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

    const action = humanView.legalActions.find((candidate) =>
      (candidate.type === "play-attack" || candidate.type === "play-defense") &&
      candidate.cardId === card.id
    );
    if (action) commitAction(action);
  };

  const commitSelectedAttack = () => {
    if (!selectedAttackAction || animating) return;
    setSelectedAttackIds([]);
    commitAction(selectedAttackAction);
  };

  const selectedAttackLabel =
    selectedAttackIds.length === 1
      ? "Ход: 1 карта"
      : selectedAttackIds.length >= 2 && selectedAttackIds.length <= 4
        ? `Ход: ${selectedAttackIds.length} карты`
        : `Ход: ${selectedAttackIds.length} карт`;

  const take = humanView.legalActions.find((action) => action.type === "take");
  const finish = humanView.legalActions.find((action) => action.type === "finish-bout");
  const result = resultCopy(state);

  return (
    <main className="game-shell">
      <section className="game-frame">
        <header className="game-header">
          <div><span className="eyebrow">Классическая карточная игра</span><h1>Дурак</h1></div>
          <div className="header-badges"><span>Подкидной</span><span>1 × 1</span></div>
        </header>

        <div className="felt">
          <div className="opponent-row">
            <PlayerSeat name="Соперник" cardCount={state.hands.bot.length} active={state.activePlayerId === "bot" && !animating} opponent />
            <TurnTimer
              remainingMs={remainingMs}
              paused={animating || pausedByEnvironment || state.phase === "finished"}
            />
          </div>

          <div className="status-pill" aria-live="polite">
            <i className={state.activePlayerId === "human" ? "status-dot status-dot--human" : "status-dot"} />
            {animating ? "Карты на столе…" : statusText(state)}
          </div>

          <section className="table-area">
            <div className="deck-area">
              <div className="deck-stack">
                {state.talon.length > 1 && <CardView back compact />}
                {state.talon.length > 0 ? (
                  <span className="trump-card"><CardView card={state.trumpCard} compact testId="trump-card" /></span>
                ) : (
                  <span
                    className={`trump-suit-marker trump-suit-marker--${state.trumpCard.suit}`}
                    data-testid="trump-suit-marker"
                    aria-label={`Козырь ${SUIT_SYMBOLS[state.trumpCard.suit]}`}
                  >
                    <small>козырь</small>
                    <b>{SUIT_SYMBOLS[state.trumpCard.suit]}</b>
                  </span>
                )}
              </div>
              <b data-testid="talon-count">{state.talon.length}</b><small>в колоде</small>
            </div>

            <div className="battlefield">
              {state.table.length === 0 ? (
                <div className="empty-table"><span>Стол свободен</span><small>{state.activePlayerId === "human" ? "Выберите карту" : "Соперник думает"}</small></div>
              ) : state.table.map((pair) => (
                <div className="card-pair" key={pair.attack.id}>
                  <CardView card={pair.attack} compact />
                  {pair.defense && <span className="defense-card"><CardView card={pair.defense} compact /></span>}
                </div>
              ))}
            </div>
          </section>

          <section className="human-area">
            <div className="human-toolbar">
              <PlayerSeat name="Игрок" cardCount={state.hands.human.length} active={state.activePlayerId === "human" && !animating} />
              <div className="action-row">
                {selectedAttackIds.length > 0 && state.activePlayerId === "human" && (
                  state.phase === "attack" ||
                  state.phase === "throw-in" ||
                  state.phase === "taking"
                ) && (
                  <button
                    className="table-action"
                    type="button"
                    disabled={animating || !selectedAttackAction}
                    onClick={commitSelectedAttack}
                  >
                    {selectedAttackLabel}
                  </button>
                )}
                {take && state.activePlayerId === "human" && <button className="table-action table-action--danger" type="button" disabled={animating} onClick={() => commitAction(take)}>Беру</button>}
                {finish && state.activePlayerId === "human" && <button className="table-action" type="button" disabled={animating} onClick={() => commitAction(finish)}>{state.phase === "taking" ? "Хватит" : "Бито"}</button>}
              </div>
            </div>

            <div className="human-hand" aria-label="Ваши карты">
              {state.hands.human.map((card, index) => {
                const offset = index - (state.hands.human.length - 1) / 2;
                return (
                  <span className="human-card-slot" style={{ "--fan": offset } as CSSProperties} key={card.id}>
                    <CardView
                      card={card}
                      playable={state.activePlayerId === "human" && !animating && playableIds.has(card.id)}
                      selected={selectedAttackIds.includes(card.id)}
                      onClick={() => playHumanCard(card)}
                      testId="human-card"
                    />
                  </span>
                );
              })}
            </div>
          </section>

          {state.phase === "finished" && (
            <div className="result-overlay" role="dialog" aria-modal="true">
              <div className="result-panel"><span className="eyebrow">Результат партии</span><h2>{result.title}</h2><p>{result.text}</p><button className="primary-button" type="button" onClick={onRestart} disabled={!onRestart}>Новая партия</button></div>
            </div>
          )}
        </div>

        <footer className="game-footer"><span>36 карт</span><span>20 сек на ход</span><span>Честная раздача</span></footer>
      </section>
    </main>
  );
}
