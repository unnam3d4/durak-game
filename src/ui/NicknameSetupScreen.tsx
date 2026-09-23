import { FormEvent, useState } from "react";
import { nicknameValidationError } from "../profile/player-profile";
import "./identity.css";

type Props = Readonly<{
  suggestedNickname: string;
  onSubmit: (nickname: string) => void;
}>;

export function NicknameSetupScreen({
  suggestedNickname,
  onSubmit
}: Props) {
  const [nickname, setNickname] = useState(suggestedNickname);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = nicknameValidationError(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onSubmit(nickname.trim());
  };

  return (
    <main className="identity-shell">
      <section className="identity-card">
        <span className="identity-eyebrow">Первый вход</span>
        <h1>Как тебя зовут за столом?</h1>
        <p>
          Это имя будет видно в партиях. Аватаров нет — за столом важны
          карты и ник.
        </p>

        <form onSubmit={submit} className="identity-form">
          <label htmlFor="player-nickname">Имя игрока</label>
          <input
            id="player-nickname"
            name="nickname"
            value={nickname}
            maxLength={16}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setNickname(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby="nickname-help nickname-error"
          />
          <div id="nickname-help" className="identity-help">
            3–16 символов · буквы · цифры · _
          </div>
          <div
            id="nickname-error"
            className="identity-error"
            aria-live="polite"
          >
            {error ?? " "}
          </div>

          <button className="identity-submit" type="submit">
            Сесть за стол
          </button>
        </form>

        <footer>
          Имя можно будет изменить позже в профиле.
        </footer>
      </section>
    </main>
  );
}
