import type { PlayerProfileV1 } from "../profile/player-profile";
import { levelForXp, rankForRating } from "../profile/progression";
import {
  rankLabel,
  t,
  type Language
} from "../i18n/i18n";

type Props = Readonly<{
  profile: PlayerProfileV1;
  coins?: number;
  nameplateId?: string;
  lang?: Language;
}>;

export function ProfileSummary({
  profile,
  coins,
  nameplateId = "nameplate_classic",
  lang = "ru"
}: Props) {
  const level = levelForXp(profile.xp);
  const rank = rankForRating(profile.rating);

  return (
    <section
      className={`profile-summary profile-summary--${nameplateId}`}
      aria-label={t(lang, "playerProfile")}
    >
      <div className="profile-summary__identity">
        <strong>{profile.nickname}</strong>
        <span>{t(lang, "level")} {level}</span>
      </div>
      <div className="profile-summary__progress">
        <span>{t(lang, "rating")} {profile.rating}</span>
        <span>{rankLabel(lang, rank.id)}</span>
        <span>{t(lang, "streak")} {profile.currentStreak}</span>
        {coins !== undefined ? <span>◉ {coins}</span> : null}
      </div>
    </section>
  );
}
