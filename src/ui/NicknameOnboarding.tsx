import { useState } from "react";
import {
  validateNickname,
  type NicknameValidationResult
} from "../profile/player-profile";

type Props = Readonly<{
  onComplete: (nickname: string) => void;
}>;

function errorCopy(
  result: Exclude<NicknameValidationResult, { ok: true }>
): string {
  switch (result.reason) {
    case "required":
      return "Введите ник";
    case "length":
      return "От 3 до 16 символов";
    case "characters":
      return "Только русские и латинские буквы, цифры и _";
    case "blocked":
      return "Выберите другой ник";
  }
}

export function NicknameOnboarding({ onComplete }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const result = validateNickname(value);
    if (!result.ok) {
      setError(errorCopy(result));
      return;
    }

    setError(null);
    onComplete(result.nickname);
  };

  return (
    <main className="menu-shell">
      <section className="menu-frame onboarding-frame">
        <div className="menu-brand">
          <span className="eyebrow">Профиль игрока</span>
          <h1>Введите ник</h1>
          <p>
            Он будет отображаться за игровым столом и в вашем профиле.
          </p>
        </div>

        <form
          className="onboarding-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="onboarding-label" htmlFor="nickname">
            Ник
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
            <strong>Продолжить</strong>
          </button>
        </form>
      </section>
    </main>
  );
}
