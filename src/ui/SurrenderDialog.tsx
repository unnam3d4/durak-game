type Props = Readonly<{
  onContinue: () => void;
  onConfirm: () => void;
}>;

export function SurrenderDialog({
  onContinue,
  onConfirm
}: Props) {
  return (
    <div className="result-overlay" role="dialog" aria-modal="true">
      <div className="result-panel">
        <span className="eyebrow">Незавершённая партия</span>
        <h2>Начать новую?</h2>
        <p>
          Отказ от сохранённой рейтинговой партии считается поражением.
        </p>
        <div className="result-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onContinue}
          >
            Продолжить партию
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onConfirm}
          >
            Сдаться и начать новую
          </button>
        </div>
      </div>
    </div>
  );
}
