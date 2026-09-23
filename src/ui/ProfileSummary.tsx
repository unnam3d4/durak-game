import type { PlayerProfileV1 } from "../profile/player-profile";
import { levelForXp, rankForRating } from "../profile/progression";

type Props = Readonly<{
  profile: PlayerProfileV1;
}>;

export function ProfileSummary({ profile }: Props) {
  const level = levelForXp(profile.xp);
  const rank = rankForRating(profile.rating);

  return (
    <section className="profile-summary" aria-label="Профиль игрока">
      <div className="profile-summary__identity">
        <strong>{profile.nickname}</strong>
        <span>Уровень {level}</span>
      </div>
      <div className="profile-summary__progress">
        <span>Рейтинг {profile.rating}</span>
        <span>{rank.label}</span>
        <span>Серия {profile.currentStreak}</span>
      </div>
    </section>
  );
}
