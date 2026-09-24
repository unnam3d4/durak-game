import {
  t,
  type Language
} from "../i18n/i18n";

type Props = Readonly<{
  onContinue: () => void;
  onConfirm: () => void;
  lang?: Language;
}>;

export function SurrenderDialog({
  onContinue,
  onConfirm,
  lang = "ru"
}: Props) {
  return (
    <div className="result-overlay" role="dialog" aria-modal="true">
      <div className="result-panel">
        <span className="eyebrow">{t(lang, "unfinishedMatch")}</span>
        <h2>{t(lang, "startNewQuestion")}</h2>
        <p>{t(lang, "abandonmentLoss")}</p>
        <div className="result-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onContinue}
          >
            {t(lang, "continueMatch")}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onConfirm}
          >
            {t(lang, "surrenderAndStart")}
          </button>
        </div>
      </div>
    </div>
  );
}
