import { useState } from "react";
import type { CSSProperties } from "react";
import { validateNickname, type PlayerProfileV1 } from "../profile/player-profile";
import type { PlayerMetaV1 } from "../meta/player-meta";
import { levelForXp, rankForRating } from "../profile/progression";
import { ACHIEVEMENTS } from "../data/achievements";
import { COSMETIC_CATALOG } from "../data/cosmetics";
import { canClaimDailyReward, DAILY_REWARDS } from "../meta/daily-reward";
import type { Language } from "../i18n/i18n";
import { cardBackAsset, UI_ASSETS } from "../assets/game-assets";
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
    nicknameInvalid: "От 3 до 16 символов: буквы, цифры и _"
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
    nicknameInvalid: "Use 3–16 letters, digits, or _"
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
  const claimable = canClaimDailyReward(meta);
  const streak = claimable
    ? Math.min(meta.dailyReward.streak + 1, DAILY_REWARDS.length)
    : Math.max(1, meta.dailyReward.streak);
  const reward = DAILY_REWARDS[streak - 1] ?? DAILY_REWARDS[0];

  return (
    <main className="menu-shell meta-shell">
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

        <div className="meta-summary-grid">
          <div><span>{c.level}</span><strong>{levelForXp(profile.xp)}</strong></div>
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
            <strong>◉ {meta.coins}</strong>
          </div>
          <div className="cosmetic-grid">
            {COSMETIC_CATALOG.map((item) => {
              const owned = meta.cosmetics.unlocked.includes(item.id);
              const equipped = meta.cosmetics.equipped[item.category] === item.id;
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
                  <div className="cosmetic-preview" aria-hidden="true">
                    {item.category === "tableTheme" ? "♣" : null}
                  </div>
                  <div>
                    <strong>{item.title[lang]}</strong>
                    <small>{item.description[lang]}</small>
                  </div>
                  {equipped ? (
                    <button type="button" disabled>{c.equipped}</button>
                  ) : owned ? (
                    <button type="button" onClick={() => onEquip(item.id)}>{c.equip}</button>
                  ) : (
                    <button type="button" disabled={meta.coins < item.price} onClick={() => onPurchase(item.id)}>
                      {c.buy} · {item.price} ◉
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
