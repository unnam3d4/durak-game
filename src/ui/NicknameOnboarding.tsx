import { useState } from "react";
import type { CSSProperties } from "react";
import {
  validateNickname,
  type NicknameValidationResult
} from "../profile/player-profile";
import {
  t,
  type Language
} from "../i18n/i18n";
import { BACKGROUND_ASSETS } from "../assets/game-assets";

type Props = Readonly<{
  onComplete: (nickname: string) => void;
  lang?: Language;
}>;

function errorCopy(
  lang: Language,
  result: Exclude<NicknameValidationResult, { ok: true }>
): string {
  switch (result.reason) {
    case "required":
      return t(lang, "nicknameRequired");
    case "length":
      return t(lang, "nicknameLength");
    case "characters":
      return t(lang, "nicknameCharacters");
    case "blocked":
      return t(lang, "nicknameBlocked");
  }
}

export function NicknameOnboarding({
  onComplete,
  lang = "ru"
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const result = validateNickname(value);
    if (!result.ok) {
      setError(errorCopy(lang, result));
      return;
    }

    setError(null);
    onComplete(result.nickname);
  };

  return (
    <main
      className="menu-shell menu-shell--art"
      style={{
        "--menu-bg-desktop": `url("${BACKGROUND_ASSETS.menuDesktop}")`,
        "--menu-bg-mobile": `url("${BACKGROUND_ASSETS.menuMobile}")`
      } as CSSProperties}
    >
      <section className="menu-frame onboarding-frame">
        <div className="menu-brand">
          <span className="eyebrow">{t(lang, "playerProfile")}</span>
          <h1>{t(lang, "enterNickname")}</h1>
          <p>{t(lang, "nicknameHelp")}</p>
        </div>

        <form
          className="onboarding-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="onboarding-label" htmlFor="nickname">
            {t(lang, "nickname")}
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            value={value}
            autoComplete="nickname"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={32}
            aria-invalid={error !== null}
            aria-describedby={error ? "nickname-error" : undefined}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
          />
          {error ? (
            <p id="nickname-error" role="alert" className="onboarding-error">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="menu-button menu-button--primary onboarding-submit"
          >
            <strong>{t(lang, "continue")}</strong>
          </button>
        </form>
      </section>
    </main>
  );
}
