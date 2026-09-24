import type { RatingChangeSummary } from "../profile/apply-match-result";
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
  lang = "ru"
}: Props) {
  const promoted =
    ratingChange !== null &&
    ratingChange.rankAfter !== ratingChange.rankBefore;

  return (
    <div className="result-overlay" role="dialog" aria-modal="true">
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
