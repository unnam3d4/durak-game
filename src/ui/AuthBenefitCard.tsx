import { useState } from "react";
import {
  t,
  type Language
} from "../i18n/i18n";

type Props = Readonly<{
  onAuthorize: () => Promise<boolean>;
  onDismiss: () => void;
  lang?: Language;
}>;

export function AuthBenefitCard({
  onAuthorize,
  onDismiss,
  lang = "ru"
}: Props) {
  const [busy, setBusy] = useState(false);

  const authorize = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onAuthorize();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-benefit-card" aria-label={t(lang, "signInYandex")}>
      <p>{t(lang, "authBenefit")}</p>
      <div className="auth-benefit-card__actions">
        <button
          type="button"
          className="menu-button menu-button--secondary"
          disabled={busy}
          onClick={() => void authorize()}
        >
          <strong>
            {busy
              ? t(lang, "authorizing")
              : t(lang, "signInYandex")}
          </strong>
        </button>
        <button
          type="button"
          className="auth-benefit-card__later"
          disabled={busy}
          onClick={onDismiss}
        >
          {t(lang, "later")}
        </button>
      </div>
    </section>
  );
}
