import { useState } from "react";
import type { CSSProperties } from "react";
import { validateNickname, type PlayerProfileV1 } from "../profile/player-profile";
import type { PlayerMetaV1 } from "../meta/player-meta";
import { levelProgress, rankForRating } from "../profile/progression";
import { ACHIEVEMENTS } from "../data/achievements";
import { COSMETIC_CATALOG } from "../data/cosmetics";
import { canClaimDailyReward, DAILY_REWARDS } from "../meta/daily-reward";
import type { Language } from "../i18n/i18n";
import {
  BACKGROUND_ASSETS,
  cardBackAsset,
  UI_ASSETS
} from "../assets/game-assets";
import "./meta-hub.css";

type Props = Readonly<{
  profile: PlayerProfileV1;
  meta: PlayerMetaV1;
  lang: Language;
  onBack: () => void;
  onClaimDaily: () => void;
  onPurchase: (id: string) => void;
  onEquip: (id: string) => void;
  onRename: (nickname: string) => void;
}>;

const text = {
  ru: {
    title: "Прогресс и коллекция",
    back: "Назад",
    level: "Уровень",
    rating: "Рейтинг",
    coins: "Монеты",
    matches: "Партий",
    wins: "Побед",
    streak: "Лучшая серия",
    daily: "Ежедневная награда",
    claim: "Забрать",
    claimed: "Уже получено сегодня",
    achievements: "Достижения",
    collection: "Коллекция",
    stats: "Статистика",
    equip: "Выбрать",
    equipped: "Выбрано",
    buy: "Купить",
    played: "игр",
    won: "побед",
    nickname: "Имя за столом",
    rename: "Изменить",
    save: "Сохранить",
    cancel: "Отмена",
    nicknameInvalid: "От 3 до 16 символов: буквы, цифры и _",
    nextLevel: "До {level} уровня",
    winRate: "Винрейт",
    collected: "Собрано",
    day: "День"
  },
  en: {
    title: "Progress & Collection",
    back: "Back",
    level: "Level",
    rating: "Rating",
    coins: "Coins",
    matches: "Matches",
    wins: "Wins",
    streak: "Best streak",
    daily: "Daily reward",
    claim: "Claim",
    claimed: "Already claimed today",
    achievements: "Achievements",
    collection: "Collection",
    stats: "Statistics",
    equip: "Equip",
    equipped: "Equipped",
    buy: "Buy",
    played: "played",
    won: "wins",
    nickname: "Table name",
    rename: "Change",
    save: "Save",
    cancel: "Cancel",
    nicknameInvalid: "Use 3–16 letters, digits, or _",
    nextLevel: "To level {level}",
    winRate: "Win rate",
    collected: "Collected",
    day: "Day"
  }
} as const;

export function MetaHubScreen({
  profile,
  meta,
  lang,
  onBack,
  onClaimDaily,
  onPurchase,
  onEquip,
  onRename
}: Props) {
  const c = text[lang];
  const [editingName, setEditingName] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const rank = rankForRating(profile.rating);
  const progress = levelProgress(profile.xp);
  const winRate =
    meta.stats.matchesPlayed > 0
      ? Math.round((meta.stats.wins / meta.stats.matchesPlayed) * 100)
      : 0;
  const claimable = canClaimDailyReward(meta);
  const streak = claimable
    ? Math.min(meta.dailyReward.streak + 1, DAILY_REWARDS.length)
    : Math.max(1, meta.dailyReward.streak);
  const reward = DAILY_REWARDS[streak - 1] ?? DAILY_REWARDS[0];
  const currentDailyIndex = Math.max(
    0,
    Math.min(DAILY_REWARDS.length - 1, streak - 1)
  );
  const claimedDailyThrough = claimable
    ? currentDailyIndex - 1
    : currentDailyIndex;
  const cardBacks = COSMETIC_CATALOG.filter(
    (item) => item.category === "cardBack"
  );
  const tableThemes = COSMETIC_CATALOG.filter(
    (item) => item.category === "tableTheme"
  );
  const collectedCosmetics = COSMETIC_CATALOG.filter((item) =>
    meta.cosmetics.unlocked.includes(item.id)
  ).length;

  const renderCosmetic = (
    item: (typeof COSMETIC_CATALOG)[number]
  ) => {
    const owned = meta.cosmetics.unlocked.includes(item.id);
    const equipped =
      meta.cosmetics.equipped[item.category] === item.id;

    return (
      <article
        key={item.id}
        data-category={item.category}
        className={`cosmetic-card cosmetic-card--${item.id}${equipped ? " cosmetic-card--equipped" : ""}`}
        style={
          item.category === "cardBack"
            ? ({
                "--cosmetic-back": `url("${cardBackAsset(item.id)}")`
              } as CSSProperties)
            : undefined
        }
      >
        <div
          className={`cosmetic-preview cosmetic-preview--${item.category}`}
          aria-hidden="true"
        >
          {item.category === "tableTheme" ? (
            <>
              <span className="table-preview__card table-preview__card--one" />
              <span className="table-preview__card table-preview__card--two" />
            </>
          ) : null}
        </div>
        <div>
          <strong>{item.title[lang]}</strong>
          <small>{item.description[lang]}</small>
        </div>
        {equipped ? (
          <button type="button" disabled>
            {c.equipped}
          </button>
        ) : owned ? (
          <button
            type="button"
            onClick={() => onEquip(item.id)}
          >
            {c.equip}
          </button>
        ) : (
          <button
            type="button"
            disabled={meta.coins < item.price}
            onClick={() => onPurchase(item.id)}
          >
            {c.buy} · {item.price} ◉
          </button>
        )}
      </article>
    );
  };

  return (
    <main
      className="menu-shell menu-shell--art meta-shell"
      style={{
        "--menu-bg-desktop": `url("${BACKGROUND_ASSETS.menuDesktop}")`,
        "--menu-bg-mobile": `url("${BACKGROUND_ASSETS.menuMobile}")`
      } as CSSProperties}
    >
      <section className="menu-frame meta-frame">
        <header className="meta-header">
          <div>
            <span className="eyebrow">{profile.nickname}</span>
            <h1>{c.title}</h1>
          </div>
          <button type="button" className="secondary-button" onClick={onBack}>
            {c.back}
          </button>
        </header>

        <section className="profile-name-card">
          <div>
            <span className="eyebrow">{c.nickname}</span>
            <strong>{profile.nickname}</strong>
          </div>
          {editingName ? (
            <form
              className="profile-name-form"
              onSubmit={(event) => {
                event.preventDefault();
                const result = validateNickname(nickname);
                if (!result.ok) {
                  setNicknameError(c.nicknameInvalid);
                  return;
                }
                onRename(result.nickname);
                setNickname(result.nickname);
                setNicknameError(null);
                setEditingName(false);
              }}
            >
              <input
                aria-label={c.nickname}
                value={nickname}
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  setNickname(event.target.value);
                  if (nicknameError) setNicknameError(null);
                }}
              />
              <button type="submit">{c.save}</button>
              <button
                type="button"
                onClick={() => {
                  setNickname(profile.nickname);
                  setNicknameError(null);
                  setEditingName(false);
                }}
              >
                {c.cancel}
              </button>
              {nicknameError ? <small role="alert">{nicknameError}</small> : null}
            </form>
          ) : (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setEditingName(true)}
            >
              {c.rename}
            </button>
          )}
        </section>

        <section className="level-progress-card">
          <div className="level-progress-card__badge">
            <span>{c.level}</span>
            <strong>{progress.level}</strong>
          </div>
          <div className="level-progress-card__body">
            <div className="level-progress-card__copy">
              <strong>
                {progress.xpIntoLevel} / {progress.xpRequired} XP
              </strong>
              <span>
                {c.nextLevel.replace(
                  "{level}",
                  String(progress.level + 1)
                )}
              </span>
            </div>
            <div
              className="level-progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.xpRequired}
              aria-valuenow={progress.xpIntoLevel}
              aria-label={
                lang === "ru"
                  ? "Прогресс уровня"
                  : "Level progress"
              }
            >
              <span
                style={{
                  "--level-progress": `${progress.fraction * 100}%`
                } as CSSProperties}
              />
            </div>
          </div>
          <div className="level-progress-card__metrics">
            <div>
              <span>{c.winRate}</span>
              <strong>{winRate}%</strong>
            </div>
            <div>
              <span>{c.collected}</span>
              <strong>
                {collectedCosmetics}/{COSMETIC_CATALOG.length}
              </strong>
            </div>
          </div>
        </section>

        <div className="meta-summary-grid">
          <div>
            <span>{c.level}</span>
            <strong>{progress.level}</strong>
            <small>{profile.xp} XP</small>
          </div>
          <div className="meta-summary-card meta-summary-card--rating">
            <img className="meta-summary-icon" src={UI_ASSETS.rating} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>{c.rating}</span><strong>{profile.rating}</strong><small>{lang === "ru" ? rank.label : rank.id === "candidate" ? "Candidate" : rank.id === "master" ? "Master" : rank.id === "grandmaster" ? "Grandmaster" : `Rank ${rank.id}`}</small></div>
          <div className="meta-summary-card meta-summary-card--coins">
            <img className="meta-summary-icon" src={UI_ASSETS.coins} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>{c.coins}</span><strong>◉ {meta.coins}</strong>
          </div>
          <div><span>{c.matches}</span><strong>{meta.stats.matchesPlayed}</strong></div>
          <div><span>{c.wins}</span><strong>{meta.stats.wins}</strong></div>
          <div><span>{c.streak}</span><strong>{meta.stats.bestStreak}</strong></div>
        </div>

        <section className="daily-card">
          <div className="daily-card__header">
            <div>
              <span className="eyebrow">{c.daily}</span>
              <strong>{claimable ? `+${reward} ◉` : c.claimed}</strong>
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={!claimable}
              onClick={onClaimDaily}
            >
              {claimable ? c.claim : "✓"}
            </button>
          </div>
          <div
            className="daily-track"
            aria-label={
              lang === "ru"
                ? "Цепочка ежедневных наград"
                : "Daily reward streak"
            }
          >
            {DAILY_REWARDS.map((dailyReward, index) => {
              const claimed = index <= claimedDailyThrough;
              const current = index === currentDailyIndex;
              return (
                <div
                  key={dailyReward}
                  data-testid={`daily-reward-${index + 1}`}
                  className={[
                    "daily-step",
                    claimed && "daily-step--claimed",
                    current && "daily-step--current"
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <small>{c.day} {index + 1}</small>
                  <strong>
                    <img
                      src={UI_ASSETS.coins}
                      alt=""
                      aria-hidden="true"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                    {dailyReward}
                  </strong>
                  <span aria-hidden="true">
                    {claimed ? "✓" : current ? "•" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="meta-section">
          <div className="meta-section-heading"><span>{c.stats}</span></div>
          <div className="stats-grid">
            {(["podkidnoy", "perevodnoy"] as const).map((variant) => (
              <article key={variant}>
                <strong>
                  {variant === "podkidnoy"
                    ? (lang === "ru" ? "Подкидной" : "Podkidnoy")
                    : (lang === "ru" ? "Переводной" : "Perevodnoy")}
                </strong>
                <small>{meta.stats.byVariant[variant].played} {c.played} · {meta.stats.byVariant[variant].wins} {c.won}</small>
              </article>
            ))}
            {(["2", "3", "4"] as const).map((count) => (
              <article key={count}>
                <strong>
                  {count} {lang === "ru" ? "игрока" : "players"}
                </strong>
                <small>{meta.stats.byParticipants[count].played} {c.played} · {meta.stats.byParticipants[count].wins} {c.won}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="meta-section">
          <div className="meta-section-heading">
            <span className="meta-section-title">
              <img src={UI_ASSETS.achievements} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              {c.achievements}
            </span>
            <strong>{meta.achievements.length}/{ACHIEVEMENTS.length}</strong>
          </div>
          <div className="achievement-grid">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = meta.achievements.includes(achievement.id);
              return (
                <article
                  key={achievement.id}
                  className={unlocked ? "achievement-card achievement-card--unlocked" : "achievement-card"}
                >
                  <b>{unlocked ? "✓" : "•"}</b>
                  <div>
                    <strong>{achievement.title[lang]}</strong>
                    <small>{achievement.description[lang]}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="meta-section">
          <div className="meta-section-heading">
            <span>{c.collection}</span>
            <div className="collection-status">
              <span>
                {collectedCosmetics}/{COSMETIC_CATALOG.length}
              </span>
              <strong className="meta-wallet">
              <img
                src={UI_ASSETS.coins}
                alt=""
                aria-hidden="true"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
                {meta.coins}
              </strong>
            </div>
          </div>

          <div className="cosmetic-group">
            <div className="cosmetic-group__heading">
              <strong>
                {lang === "ru" ? "Рубашки" : "Card backs"}
              </strong>
              <span>{cardBacks.length}</span>
            </div>
            <div className="cosmetic-grid">
              {cardBacks.map(renderCosmetic)}
            </div>
          </div>

          <div className="cosmetic-group">
            <div className="cosmetic-group__heading">
              <strong>
                {lang === "ru" ? "Столы" : "Tables"}
              </strong>
              <span>{tableThemes.length}</span>
            </div>
            <div className="cosmetic-grid cosmetic-grid--tables">
              {tableThemes.map(renderCosmetic)}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
