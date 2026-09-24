const RU_NAMES = [
  "Артём","Антон","Борис","Вадим","Виктор","Глеб","Денис","Егор",
  "Игорь","Илья","Кирилл","Лев","Макс","Миша","Никита","Олег",
  "Павел","Рома","Руслан","Саша","Сергей","Слава","Стас","Тимур",
  "Юра","Дима","Макар","Данил","Матвей","Арсен","Федя","Вова",
  "Женя","Костя","Лена","Кира","Маша","Настя","Алиса","Дарья"
] as const;

const EN_NAMES = [
  "Alex","Anton","Artem","Boris","Vadim","Viktor","Vlad","Gleb",
  "Denis","Egor","Igor","Ilya","Kirill","Leon","Max","Misha",
  "Nikita","Oleg","Pavel","Roman","Ruslan","Sasha","Serge","Slava",
  "Stas","Timur","Yura","Dima","Makar","Danil","Matvey","Mark",
  "Leo","Sam","Kate","Lina","Mira","Daria","Nick","Ray"
] as const;

const RU_TAGS = [
  "Лис","Волк","Сокол","Барс","Кедр","Шторм","Север","Маяк","Туман","Ветер",
  "Иней","Риф","Клён","Луч","Гром","Дождь","Пульс","Тень","Искра","Огонь",
  "Берег","Камень","Омут","Заря","Снег","Лёд","Мир","Ход","Туз","Козырь",
  "Блик","Вихрь","Ритм","Филин","Ястреб","Бобр","Зубр","Орёл","Рысь","Кит",
  "Краб","Дуб","Луг","Пик","Вал","Край","Форт","Мост","Порт","Шаг"
] as const;

const EN_TAGS = [
  "Fox","Wolf","Raven","Bear","Storm","North","River","Stone","Ace","Lucky",
  "Pixel","Vector","Orbit","Comet","Neon","Frost","Wave","Shadow","Spark","Flame",
  "Coast","Rock","Mist","Wind","Ice","Beam","Beat","Owl","Hawk","Bison",
  "Lynx","Whale","Crab","Oak","Dune","Peak","Fort","Bridge","Port","Step",
  "Cloud","Night","Dawn","Swift","Quiet","Bold","Wild","Blue","Green","Gold"
] as const;

export const OPPONENT_NICKNAME_STYLE_COUNT = 8;
const NAMES_PER_STYLE = 2_500;
export const SAFE_OPPONENT_NICKNAME_COUNT =
  OPPONENT_NICKNAME_STYLE_COUNT * NAMES_PER_STYLE;

function plainName(
  index: number,
  names: readonly string[]
): string {
  const name = names[index % names.length]!;
  const variant = Math.floor(index / names.length);
  return variant === 0 ? name : `${name}${variant + 3}`;
}

function taggedName(
  index: number,
  tags: readonly string[]
): string {
  const tag = tags[index % tags.length]!;
  const variant = Math.floor(index / tags.length);
  return variant === 0 ? tag : `${tag}_${variant + 7}`;
}

function compoundName(
  index: number,
  names: readonly string[],
  tags: readonly string[],
  separator: "" | "_"
): string {
  const combinations = names.length * tags.length;
  const normalized = index % combinations;
  const name = names[normalized % names.length]!;
  const tag =
    tags[Math.floor(normalized / names.length) % tags.length]!;
  const round = Math.floor(index / combinations);
  return `${name}${separator}${tag}${round === 0 ? "" : round + 1}`;
}

export function safeOpponentNickname(index: number): string {
  const normalized =
    ((Math.floor(index) % SAFE_OPPONENT_NICKNAME_COUNT) +
      SAFE_OPPONENT_NICKNAME_COUNT) %
    SAFE_OPPONENT_NICKNAME_COUNT;
  const style = normalized % OPPONENT_NICKNAME_STYLE_COUNT;
  const localIndex = Math.floor(
    normalized / OPPONENT_NICKNAME_STYLE_COUNT
  );

  switch (style) {
    case 0:
      return plainName(localIndex, RU_NAMES);
    case 1:
      return plainName(localIndex, EN_NAMES);
    case 2:
      return taggedName(localIndex, RU_TAGS);
    case 3:
      return taggedName(localIndex, EN_TAGS);
    case 4:
      return compoundName(localIndex, RU_NAMES, RU_TAGS, "");
    case 5:
      return compoundName(localIndex, EN_NAMES, EN_TAGS, "");
    case 6:
      return compoundName(localIndex, RU_NAMES, RU_TAGS, "_");
    case 7:
      return compoundName(localIndex, EN_NAMES, EN_TAGS, "_");
    default:
      return "Player";
  }
}

export function opponentNicknamePool(
  count = SAFE_OPPONENT_NICKNAME_COUNT
): readonly string[] {
  const size = Math.max(
    0,
    Math.min(SAFE_OPPONENT_NICKNAME_COUNT, Math.floor(count))
  );
  return Array.from({ length: size }, (_, index) =>
    safeOpponentNickname(index)
  );
}
