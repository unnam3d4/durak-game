const RU_BASE_NAMES = [
  "Артём","Антон","Борис","Вадим","Виктор","Глеб","Денис","Егор",
  "Игорь","Илья","Кирилл","Лев","Макс","Миша","Никита","Олег",
  "Павел","Рома","Руслан","Саша","Сергей","Слава","Стас","Тимур",
  "Юра","Дима","Макар","Данил","Матвей","Арсен","Федя","Вова",
  "Женя","Костя","Паша","Ринат","Марат","Ярик","Степан","Андрей"
] as const;

const EN_BASE_NAMES = [
  "Alex","Anton","Artem","Boris","Vadim","Viktor","Vlad","Gleb",
  "Denis","Egor","Igor","Ilya","Kirill","Leon","Max","Misha",
  "Nikita","Oleg","Pavel","Roman","Ruslan","Sasha","Serge","Slava",
  "Stas","Timur","Yura","Dima","Makar","Danil","Matvey","Mark",
  "Leo","Sam","Nick","Mike","Chris","Andy","Fred","Ray"
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

const ALL_BASE_NAMES = [
  ...RU_BASE_NAMES,
  ...EN_BASE_NAMES
] as const;

const SIMPLE_COUNT = ALL_BASE_NAMES.length;
const RU_COMPOUND_COUNT = RU_BASE_NAMES.length * RU_TAGS.length;
const EN_COMPOUND_COUNT = EN_BASE_NAMES.length * EN_TAGS.length;
const COMPOUND_COUNT =
  (RU_COMPOUND_COUNT + EN_COMPOUND_COUNT) * 2;
const NUMERIC_VARIANTS_PER_BASE = 149;

export const SAFE_OPPONENT_NICKNAME_COUNT =
  SIMPLE_COUNT +
  COMPOUND_COUNT +
  ALL_BASE_NAMES.length * NUMERIC_VARIANTS_PER_BASE;

function compoundName(
  index: number,
  bases: readonly string[],
  tags: readonly string[],
  reverse: boolean
): string {
  const base = bases[index % bases.length]!;
  const tag = tags[Math.floor(index / bases.length) % tags.length]!;
  return reverse ? `${tag}${base}` : `${base}${tag}`;
}

function numericName(index: number): string {
  const base = ALL_BASE_NAMES[index % ALL_BASE_NAMES.length]!;
  const variant =
    Math.floor(index / ALL_BASE_NAMES.length) + 1;
  const suffix =
    variant % 3 === 0 ? `_${variant}` : String(variant);
  return `${base}${suffix}`;
}

export function safeOpponentNickname(index: number): string {
  let normalized =
    ((Math.floor(index) % SAFE_OPPONENT_NICKNAME_COUNT) +
      SAFE_OPPONENT_NICKNAME_COUNT) %
    SAFE_OPPONENT_NICKNAME_COUNT;

  if (normalized < SIMPLE_COUNT) {
    return ALL_BASE_NAMES[normalized]!;
  }
  normalized -= SIMPLE_COUNT;

  if (normalized < RU_COMPOUND_COUNT) {
    return compoundName(
      normalized,
      RU_BASE_NAMES,
      RU_TAGS,
      false
    );
  }
  normalized -= RU_COMPOUND_COUNT;

  if (normalized < RU_COMPOUND_COUNT) {
    return compoundName(
      normalized,
      RU_BASE_NAMES,
      RU_TAGS,
      true
    );
  }
  normalized -= RU_COMPOUND_COUNT;

  if (normalized < EN_COMPOUND_COUNT) {
    return compoundName(
      normalized,
      EN_BASE_NAMES,
      EN_TAGS,
      false
    );
  }
  normalized -= EN_COMPOUND_COUNT;

  if (normalized < EN_COMPOUND_COUNT) {
    return compoundName(
      normalized,
      EN_BASE_NAMES,
      EN_TAGS,
      true
    );
  }
  normalized -= EN_COMPOUND_COUNT;

  return numericName(normalized);
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
