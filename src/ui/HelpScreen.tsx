import type { Language } from "../i18n/i18n";

type Props = Readonly<{
  lang: Language;
  onBack: () => void;
}>;

const copy = {
  ru: {
    title: "Как играть",
    back: "Назад",
    intro:
      "Избавьтесь от всех карт раньше соперников. Последний игрок с картами остаётся дураком.",
    controlsTitle: "Управление",
    controls:
      "На ПК карту можно нажать или перетащить мышью. На телефоне — коснуться или перетащить пальцем. При защите тяните карту на конкретную атакующую карту.",
    timerTitle: "Ход",
    timer:
      "На действие даётся 20 секунд. Таймер начинается после завершения анимации. Если время игрока закончилось, засчитывается техническое поражение.",
    podTitle: "Подкидной",
    pod:
      "Атаковать можно картами одинакового достоинства. Подкидывать можно только достоинства, которые уже есть на столе. За один кон — не больше шести атакующих карт и не больше карт, чем было у защитника в начале кона.",
    perTitle: "Переводной",
    per:
      "До первой защиты атаку можно перевести следующему игроку картой того же достоинства, если новый защитник может принять весь набор.",
    rankedTitle: "Рейтинг и прогресс",
    ranked:
      "Рейтинговые партии меняют рейтинг и разряд. За завершённые партии вы получаете XP, монеты и достижения. Монеты тратятся только на косметику — ставок в игре нет."
  },
  en: {
    title: "How to play",
    back: "Back",
    intro:
      "Get rid of all your cards before your opponents. The last player holding cards is the Durak.",
    controlsTitle: "Controls",
    controls:
      "On desktop, click a card or drag it with the mouse. On mobile, tap or drag with your finger. When defending, drag a card onto the specific attack card you want to beat.",
    timerTitle: "Turn",
    timer:
      "You have 20 seconds to act. The timer starts after the previous animation finishes. Running out of time causes a technical loss.",
    podTitle: "Podkidnoy",
    pod:
      "You may open with cards of the same rank. Throw-ins must match ranks already visible on the table. A bout allows at most six attack cards and never more than the defender held at its start.",
    perTitle: "Perevodnoy",
    per:
      "Before the first defense, the attack may be transferred to the next player with cards of the same rank if the new defender can accept the full attack.",
    rankedTitle: "Rating & progression",
    ranked:
      "Ranked matches change rating and rank. Completed matches award XP, coins, and achievements. Coins are cosmetic-only; there is no wagering."
  }
} as const;

export function HelpScreen({ lang, onBack }: Props) {
  const c = copy[lang];

  return (
    <main className="menu-shell">
      <section className="menu-frame help-screen">
        <header className="help-screen__header">
          <div>
            <span className="eyebrow">
              {lang === "ru" ? "Правила и управление" : "Rules & controls"}
            </span>
            <h1>{c.title}</h1>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            {c.back}
          </button>
        </header>

        <p className="help-screen__intro">{c.intro}</p>

        <div className="help-grid">
          <article>
            <strong>{c.controlsTitle}</strong>
            <p>{c.controls}</p>
          </article>
          <article>
            <strong>{c.timerTitle}</strong>
            <p>{c.timer}</p>
          </article>
          <article>
            <strong>{c.podTitle}</strong>
            <p>{c.pod}</p>
          </article>
          <article>
            <strong>{c.perTitle}</strong>
            <p>{c.per}</p>
          </article>
          <article className="help-grid__wide">
            <strong>{c.rankedTitle}</strong>
            <p>{c.ranked}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
