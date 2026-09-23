import type { RatingChangeSummary } from "../profile/apply-match-result";

type Props = Readonly<{
  title: string;
  text: string;
  ratingChange?: RatingChangeSummary | null;
  onRestart?: () => void;
  onExitToMenu?: () => void;
}>;

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function ResultOverlay({
  title,
  text,
  ratingChange = null,
  onRestart,
  onExitToMenu
}: Props) {
  const promoted =
    ratingChange !== null &&
    ratingChange.rankAfter !== ratingChange.rankBefore;

  return (
    <div className="result-overlay" role="dialog" aria-modal="true">
      <div className="result-panel">
        <span className="eyebrow">Результат партии</span>
        <h2>{title}</h2>
        <p>{text}</p>

        {ratingChange ? (
          <section
            className={
              promoted
                ? "result-rating result-rating--promotion"
                : "result-rating"
            }
            aria-label="Изменение рейтинга"
          >
            {promoted ? (
              <>
                <strong>Новый разряд</strong>
                <span>{ratingChange.rankAfter}</span>
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
            Новая партия
          </button>
          {onExitToMenu ? (
            <button
              className="secondary-button"
              type="button"
              onClick={onExitToMenu}
            >
              В меню
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
