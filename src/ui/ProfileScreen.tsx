import { useState, type FormEvent } from "react";
import { ACHIEVEMENTS } from "../data/achievements";
import { PROGRESSION_BALANCE } from "../data/progression-balance";
import {
  nicknameValidationError,
  type MatchStatsBucket,
  type PlayerProfile
} from "../profile/player-profile";
import {
  levelForXp,
  rankForRating,
  winRate
} from "../progression/profile-progression";
import "./profile.css";

type Props = Readonly<{
  profile: PlayerProfile;
  onBack: () => void;
  onRename: (nickname: string) => void;
}>;

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function bucketCopy(bucket: MatchStatsBucket): string {
  if (bucket.played === 0) return "Нет партий";
  return `${bucket.wins}В · ${bucket.losses}П · ${bucket.draws}Н`;
}

export function ProfileScreen({
  profile,
  onBack,
  onRename
}: Props) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);
  const [error, setError] = useState<string | null>(null);

  const level = levelForXp(profile.xp);
  const rank = rankForRating(profile.rating);
  const levelProgress = profile.xp % PROGRESSION_BALANCE.xpPerLevel;
  const levelProgressPercent =
    (levelProgress / PROGRESSION_BALANCE.xpPerLevel) * 100;

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = nicknameValidationError(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    onRename(nickname);
    setEditing(false);
    setError(null);
  };

  return (
    <main className="profile-shell">
      <section className="profile-frame">
        <header className="profile-header">
          <button
            className="profile-back"
            type="button"
            onClick={onBack}
          >
            ← В меню
          </button>
          <div>
            <span className="profile-eyebrow">Профиль игрока</span>
            <h1>{profile.nickname}</h1>
          </div>
          <div className="profile-coins">
            <span>Монеты</span>
            <strong>{profile.coins}</strong>
          </div>
        </header>

        <div className="profile-content">
          <section className="profile-identity-card">
            <div className="profile-level-orb">
              <span>Уровень</span>
              <strong>{level}</strong>
            </div>

            <div className="profile-level-copy">
              <span>Опыт</span>
              <strong>
                {levelProgress} / {PROGRESSION_BALANCE.xpPerLevel} XP
              </strong>
              <div
                className="profile-progress"
                role="progressbar"
                aria-label="Прогресс уровня"
                aria-valuemin={0}
                aria-valuemax={PROGRESSION_BALANCE.xpPerLevel}
                aria-valuenow={levelProgress}
              >
                <i style={{ width: `${levelProgressPercent}%` }} />
              </div>
            </div>

            <div className="profile-rank">
              <span>Разряд</span>
              <strong>{rank}</strong>
              <small>{profile.rating} рейтинга</small>
            </div>
          </section>

          <section className="profile-stats" aria-labelledby="stats-title">
            <div className="profile-section-heading">
              <div>
                <span>Статистика</span>
                <h2 id="stats-title">За все партии</h2>
              </div>
            </div>

            <div className="profile-stat-grid">
              <div>
                <span>Партии</span>
                <strong>{profile.stats.matchesPlayed}</strong>
              </div>
              <div>
                <span>Победы</span>
                <strong>{profile.stats.wins}</strong>
              </div>
              <div>
                <span>Поражения</span>
                <strong>{profile.stats.losses}</strong>
              </div>
              <div>
                <span>Винрейт</span>
                <strong>{percent(winRate(profile.stats))}</strong>
              </div>
              <div>
                <span>Серия</span>
                <strong>{profile.stats.currentStreak}</strong>
              </div>
              <div>
                <span>Лучшая серия</span>
                <strong>{profile.stats.bestStreak}</strong>
              </div>
            </div>
          </section>

          <section className="profile-splits">
            <div className="profile-split-card">
              <span className="profile-eyebrow">По правилам</span>
              <div>
                <strong>Подкидной</strong>
                <small>{bucketCopy(profile.stats.byVariant.podkidnoy)}</small>
              </div>
              <div>
                <strong>Переводной</strong>
                <small>{bucketCopy(profile.stats.byVariant.perevodnoy)}</small>
              </div>
            </div>

            <div className="profile-split-card">
              <span className="profile-eyebrow">По столам</span>
              {(["2", "3", "4"] as const).map((count) => (
                <div key={count}>
                  <strong>{count} игрока</strong>
                  <small>
                    {bucketCopy(profile.stats.byParticipants[count])}
                  </small>
                </div>
              ))}
            </div>
          </section>

          <section className="profile-achievements" aria-labelledby="achievements-title">
            <div className="profile-section-heading">
              <div>
                <span>Коллекция</span>
                <h2 id="achievements-title">Достижения</h2>
              </div>
              <strong>
                {profile.achievements.length} / {ACHIEVEMENTS.length}
              </strong>
            </div>

            <div className="achievement-grid">
              {ACHIEVEMENTS.map((achievement) => {
                const unlocked = profile.achievements.includes(
                  achievement.id
                );
                return (
                  <article
                    className={
                      unlocked
                        ? "achievement-card achievement-card--unlocked"
                        : "achievement-card"
                    }
                    key={achievement.id}
                  >
                    <span>{unlocked ? "✓" : "·"}</span>
                    <div>
                      <strong>{achievement.title}</strong>
                      <small>{achievement.description}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="profile-settings">
            <div className="profile-section-heading">
              <div>
                <span>Настройка</span>
                <h2>Имя за столом</h2>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setNickname(profile.nickname);
                    setEditing(true);
                  }}
                >
                  Изменить
                </button>
              )}
            </div>

            {editing ? (
              <form className="profile-rename" onSubmit={submitRename}>
                <input
                  aria-label="Новое имя"
                  value={nickname}
                  maxLength={16}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => {
                    setNickname(event.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={error !== null}
                />
                <button type="submit">Сохранить</button>
                <button
                  type="button"
                  onClick={() => {
                    setNickname(profile.nickname);
                    setEditing(false);
                    setError(null);
                  }}
                >
                  Отмена
                </button>
                <p aria-live="polite">{error ?? " "}</p>
              </form>
            ) : (
              <p className="profile-current-name">{profile.nickname}</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
