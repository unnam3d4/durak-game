import { useState } from "react";
import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import type { ParticipantCount } from "../core/participants";
import "./menu.css";

type Props = Readonly<{
  nickname: string;
  hasResume: boolean;
  onResume: () => void;
  onQuickMatch: () => void;
  onStartCustom: (
    participantCount: ParticipantCount,
    variant: MultiplayerVariant
  ) => void;
}>;

const PLAYER_COUNTS: readonly ParticipantCount[] = [2, 3, 4];

function playerLabel(count: ParticipantCount): string {
  if (count === 2) return "2 игрока";
  return `${count} игрока`;
}

export function GameMenu({
  nickname,
  hasResume,
  onResume,
  onQuickMatch,
  onStartCustom
}: Props) {
  const [selectingMode, setSelectingMode] = useState(false);
  const [variant, setVariant] =
    useState<MultiplayerVariant>("podkidnoy");
  const [participantCount, setParticipantCount] =
    useState<ParticipantCount>(2);

  if (selectingMode) {
    return (
      <main className="menu-shell">
        <section className="menu-frame menu-frame--select">
          <header className="menu-header">
            <button
              className="menu-back"
              type="button"
              onClick={() => setSelectingMode(false)}
            >
              ← Назад
            </button>
            <div>
              <span className="menu-eyebrow">Настройка партии</span>
              <h1>Выберите режим</h1>
            </div>
          </header>

          <div className="mode-content">
            <section className="mode-section" aria-labelledby="variant-title">
              <div className="mode-heading">
                <span>01</span>
                <div>
                  <h2 id="variant-title">Правила</h2>
                  <p>Выберите вариант классического «Дурака».</p>
                </div>
              </div>

              <div className="mode-grid mode-grid--variants">
                <button
                  className={
                    variant === "podkidnoy"
                      ? "mode-card mode-card--active"
                      : "mode-card"
                  }
                  type="button"
                  aria-pressed={variant === "podkidnoy"}
                  onClick={() => setVariant("podkidnoy")}
                >
                  <span className="mode-card__mark">П</span>
                  <strong>Подкидной</strong>
                  <small>
                    Классические правила: отбивайтесь и подкидывайте
                    карты того же достоинства.
                  </small>
                </button>

                <button
                  className={
                    variant === "perevodnoy"
                      ? "mode-card mode-card--active"
                      : "mode-card"
                  }
                  type="button"
                  aria-pressed={variant === "perevodnoy"}
                  onClick={() => setVariant("perevodnoy")}
                >
                  <span className="mode-card__mark">↻</span>
                  <strong>Переводной</strong>
                  <small>
                    Добавьте карту того же достоинства и переведите
                    атаку следующему игроку.
                  </small>
                </button>
              </div>
            </section>

            <section className="mode-section" aria-labelledby="players-title">
              <div className="mode-heading">
                <span>02</span>
                <div>
                  <h2 id="players-title">Игроки</h2>
                  <p>Вы играете против компьютерных соперников.</p>
                </div>
              </div>

              <div className="player-count-grid">
                {PLAYER_COUNTS.map((count) => (
                  <button
                    className={
                      participantCount === count
                        ? "player-count player-count--active"
                        : "player-count"
                    }
                    type="button"
                    aria-pressed={participantCount === count}
                    key={count}
                    onClick={() => setParticipantCount(count)}
                  >
                    <strong>{count}</strong>
                    <span>{playerLabel(count)}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="mode-summary">
              <div>
                <span>Вы выбрали</span>
                <strong>
                  {variant === "podkidnoy" ? "Подкидной" : "Переводной"}
                  {" · "}
                  {playerLabel(participantCount)}
                </strong>
              </div>
              <button
                className="menu-primary"
                type="button"
                onClick={() => onStartCustom(participantCount, variant)}
              >
                Начать партию
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="menu-shell">
      <section className="menu-frame">
        <div className="menu-hero">
          <div className="menu-player-chip">
            <span>Игрок</span>
            <strong>{nickname}</strong>
          </div>
          <div className="menu-brand">
            <span className="menu-eyebrow">Классическая карточная игра</span>
            <h1>Дурак</h1>
            <p>
              Подкидной и переводной. Честная колода, быстрые партии
              и соперники без скрытого преимущества.
            </p>
          </div>

          <div className="menu-card-fan" aria-hidden="true">
            <span className="menu-fan-card menu-fan-card--one">
              <b>6</b><i>♣</i>
            </span>
            <span className="menu-fan-card menu-fan-card--two">
              <b>Д</b><i>♥</i>
            </span>
            <span className="menu-fan-card menu-fan-card--three">
              <b>Т</b><i>♠</i>
            </span>
          </div>
        </div>

        <div className="menu-actions">
          {hasResume && (
            <button
              className="menu-primary menu-primary--resume"
              type="button"
              onClick={onResume}
            >
              <span>Продолжить</span>
              <small>Вернуться к незаконченной партии</small>
            </button>
          )}

          <button
            className="menu-primary"
            type="button"
            onClick={onQuickMatch}
          >
            <span>Быстрый матч</span>
            <small>Подкидной · 2 игрока</small>
          </button>

          <button
            className="menu-secondary"
            type="button"
            onClick={() => setSelectingMode(true)}
          >
            <span>Выбрать режим</span>
            <small>Подкидной / Переводной · 2–4 игрока</small>
          </button>
        </div>

        <div className="menu-meta-grid" aria-label="Будущие разделы">
          <div>
            <strong>Профиль</strong>
            <span>Скоро</span>
          </div>
          <div>
            <strong>Коллекция</strong>
            <span>Скоро</span>
          </div>
          <div>
            <strong>Достижения</strong>
            <span>Скоро</span>
          </div>
        </div>

        <footer className="menu-footer">
          <span>36 карт</span>
          <span>20 сек на ход</span>
          <span>Без ставок</span>
        </footer>
      </section>
    </main>
  );
}
