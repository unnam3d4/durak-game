const BASE_NAMES = [
  "Artem","Anton","Andrey","Boris","Vadim","Viktor","Vlad","Gleb",
  "Denis","Egor","Igor","Ilya","Kirill","Leon","Maks","Misha",
  "Nikita","Oleg","Pavel","Roma","Ruslan","Sasha","Serega","Slava",
  "Stas","Timur","Yura","Alex","Dima","Makar","Danil","Matvey",
  "Димон","Макс","Илья","Рома","Саня","Егор","Денис","Миша",
  "Вадим","Антон","Кирилл","Глеб","Руслан","Стас","Тимур","Паша",
  "Лис","Волк","Сокол","Барс","Кедр","Шторм","Север","Маяк",
  "Fox","Wolf","Raven","Bear","Storm","North","River","Stone",
  "Ace","Lucky","Pixel","Vector","Orbit","Comet","Neon","Frost",
  "Kotik","Volk","Lis","Sokol","Zubr","Bober","Klen","Veter"
] as const;

const VARIANTS_PER_BASE = 250;
export const SAFE_OPPONENT_NICKNAME_COUNT =
  BASE_NAMES.length * VARIANTS_PER_BASE;

function suffixFor(index: number): string {
  if (index === 0) return "";
  if (index < 10) return `_${index}`;
  if (index < 100) return String(index);
  if (index < 170) return `_${index - 70}`;
  return `x${index - 169}`;
}

export function safeOpponentNickname(index: number): string {
  const normalized =
    ((Math.floor(index) % SAFE_OPPONENT_NICKNAME_COUNT) +
      SAFE_OPPONENT_NICKNAME_COUNT) %
    SAFE_OPPONENT_NICKNAME_COUNT;
  const baseIndex = normalized % BASE_NAMES.length;
  const variantIndex = Math.floor(normalized / BASE_NAMES.length);
  return `${BASE_NAMES[baseIndex]}${suffixFor(variantIndex)}`;
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
