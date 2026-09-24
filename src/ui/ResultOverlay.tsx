import type { CSSProperties } from "react";
import type { RatingChangeSummary } from "../profile/apply-match-result";
import { BACKGROUND_ASSETS } from "../assets/game-assets";
import type { MetaMatchDelta } from "../meta/apply-meta-match-result";
import { ACHIEVEMENTS } from "../data/achievements";
import {
  localizeStoredRankLabel,
  t,
  type Language
} from "../i18n/i18n";

type Props = Readonly<{
  title: string;
  text: string;
  ratingChange?: RatingChangeSummary | null;
  onRestart?: () => void;
  onExitToMenu?: () => void;
  metaReward?: MetaMatchDelta | null;
  rewardedClaimed?: boolean;
  onDoubleCoins?: () => void | Promise<void>;
  outcome?: "victory" | "defeat" | "neutral";
  lang?: Language;
}>;

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function ResultOverlay({
  title,
  text,
  ratingChange = null,
  onRestart,
  onExitToMenu,
  metaReward = null,
  rewardedClaimed = false,
  onDoubleCoins,
  outcome = "neutral",
  lang = "ru"
}: Props) {
  const promoted =
    ratingChange !== null &&
    ratingChange.rankAfter !== ratingChange.rankBefore;

  const desktopBackground =
    outcome === "victory"
      ? BACKGROUND_ASSETS.victoryDesktop
      : outcome === "defeat"
        ? BACKGROUND_ASSETS.defeatDesktop
        : null;
  const mobileBackground =
    outcome === "victory"
      ? BACKGROUND_ASSETS.victoryMobile
      : outcome === "defeat"
        ? BACKGROUND_ASSETS.defeatMobile
        : null;

  return (
    <div
      className={`result-overlay result-overlay--${outcome}`}
      role="dialog"
      aria-modal="true"
      style={{
        "--result-bg-desktop": desktopBackground
          ? `url("${desktopBackground}")`
          : "none",
        "--result-bg-mobile": mobileBackground
          ? `url("${mobileBackground}")`
          : "none"
      } as CSSProperties}
    >
      <div className="result-panel">
        <span className="eyebrow">{t(lang, "resultTitle")}</span>
        <h2>{title}</h2>
        <p>{text}</p>

        {ratingChange ? (
          <section
            className={
              promoted
                ? "result-rating result-rating--promotion"
                : "result-rating"
            }
            aria-label={t(lang, "ratingChange")}
          >
            {promoted ? (
              <>
                <strong>{t(lang, "newRank")}</strong>
                <span>
                  {localizeStoredRankLabel(
                    lang,
                    ratingChange.rankAfter
                  )}
                </span>
              </>
            ) : null}
            <span>
              {ratingChange.before} → {ratingChange.after}
            </span>
            <strong>{signed(ratingChange.delta)}</strong>
            <span>+{ratingChange.xpGained} XP</span>
          </section>
        ) : null}

        {metaReward &&
        (metaReward.coins > 0 ||
          metaReward.achievementsUnlocked.length > 0) ? (
          <section className="result-rewards">
            {metaReward.coins > 0 ? (
              <div className="result-rewards__coins">
                <span>{lang === "ru" ? "Награда" : "Reward"}</span>
                <strong>+{metaReward.coins} ◉</strong>
              </div>
            ) : null}
            {metaReward.achievementsUnlocked.length > 0 ? (
              <div className="result-rewards__achievements">
                <span>
                  {lang === "ru"
                    ? "Новые достижения"
                    : "New achievements"}
                </span>
                {metaReward.achievementsUnlocked.map((id) => {
                  const achievement = ACHIEVEMENTS.find(
                    (item) => item.id === id
                  );
                  return achievement ? (
                    <strong key={id}>
                      {achievement.title[lang]}
                    </strong>
                  ) : null;
                })}
              </div>
            ) : null}
            {metaReward.coins > 0 && onDoubleCoins ? (
              <button
                type="button"
                className="rewarded-button"
                disabled={rewardedClaimed}
                onClick={() => void onDoubleCoins()}
              >
                {rewardedClaimed
                  ? (lang === "ru"
                      ? "Бонус получен ×2"
                      : "Bonus received ×2")
                  : (lang === "ru"
                      ? `Посмотреть рекламу: +${metaReward.coins} ◉`
                      : `Watch ad: +${metaReward.coins} coins`)}
              </button>
            ) : null}
          </section>
        ) : null}

        <div className="result-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onRestart}
            disabled={!onRestart}
          >
            {t(lang, "newMatch")}
          </button>
          {onExitToMenu ? (
            <button
              className="secondary-button"
              type="button"
              onClick={onExitToMenu}
            >
              {t(lang, "menu")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
