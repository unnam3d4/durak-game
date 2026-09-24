import type { CSSProperties } from "react";
import {
  BACKGROUND_ASSETS,
  UI_ASSETS
} from "../assets/game-assets";
import type { Language } from "../i18n/i18n";

type Props = Readonly<{
  lang: Language;
  soundEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  onBack: () => void;
}>;

export function SettingsScreen({
  lang,
  soundEnabled,
  onSoundChange,
  onBack
}: Props) {
  const copy =
    lang === "ru"
      ? {
          eyebrow: "Параметры игры",
          title: "Настройки",
          sound: "Звук",
          soundHint: "Карты, интерфейс и результат партии",
          enabled: "Включён",
          disabled: "Выключен",
          language: "Язык",
          languageHint: "Определяется языком платформы",
          languageValue: "Русский",
          back: "Назад"
        }
      : {
          eyebrow: "Game preferences",
          title: "Settings",
          sound: "Sound",
          soundHint: "Cards, interface and match result",
          enabled: "On",
          disabled: "Off",
          language: "Language",
          languageHint: "Follows the platform language",
          languageValue: "English",
          back: "Back"
        };

  return (
    <main
      className="menu-shell menu-shell--art settings-shell"
      style={{
        "--menu-bg-desktop": `url("${BACKGROUND_ASSETS.menuDesktop}")`,
        "--menu-bg-mobile": `url("${BACKGROUND_ASSETS.menuMobile}")`
      } as CSSProperties}
    >
      <section className="menu-frame settings-frame">
        <header className="settings-header">
          <div className="settings-title">
            <img
              src={UI_ASSETS.settings}
              alt=""
              aria-hidden="true"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div>
              <span className="eyebrow">{copy.eyebrow}</span>
              <h1>{copy.title}</h1>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            {copy.back}
          </button>
        </header>

        <section className="settings-card">
          <img
            className="settings-card__icon"
            src={UI_ASSETS.sound}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div className="settings-card__copy">
            <strong>{copy.sound}</strong>
            <span>{copy.soundHint}</span>
          </div>
          <button
            type="button"
            className="settings-switch"
            role="switch"
            aria-checked={soundEnabled}
            aria-label={copy.sound}
            onClick={() => onSoundChange(!soundEnabled)}
          >
            <span aria-hidden="true" />
            <b>
              {soundEnabled ? copy.enabled : copy.disabled}
            </b>
          </button>
        </section>

        <section className="settings-card settings-card--readonly">
          <div className="settings-card__language" aria-hidden="true">
            {lang.toUpperCase()}
          </div>
          <div className="settings-card__copy">
            <strong>{copy.language}</strong>
            <span>{copy.languageHint}</span>
          </div>
          <b className="settings-value">{copy.languageValue}</b>
        </section>
      </section>
    </main>
  );
}
