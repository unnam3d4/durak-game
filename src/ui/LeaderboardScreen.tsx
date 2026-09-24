import { useEffect, useState } from "react";
import type {
  GamePlatform,
  LeaderboardSnapshot
} from "../platform/game-platform";
import type { PlayerProfileV1 } from "../profile/player-profile";
import { rankForRating } from "../profile/progression";
import {
  rankLabel,
  t,
  type Language
} from "../i18n/i18n";
import { AuthBenefitCard } from "./AuthBenefitCard";

type Props = Readonly<{
  platform: GamePlatform | null;
  profile: PlayerProfileV1;
  authorized: boolean;
  onAuthorize: () => Promise<boolean>;
  onBack: () => void;
  lang?: Language;
}>;

export function LeaderboardScreen({
  platform,
  profile,
  authorized,
  onAuthorize,
  onBack,
  lang = "ru"
}: Props) {
  const [snapshot, setSnapshot] =
    useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(authorized);

  useEffect(() => {
    let cancelled = false;

    if (!authorized || !platform) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void platform
      .getLeaderboard()
      .then((next) => {
        if (!cancelled) setSnapshot(next);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authorized, platform]);

  const rank = rankForRating(profile.rating);
  const forming =
    snapshot !== null && snapshot.entries.length < 10;

  return (
    <main className="menu-shell">
      <section className="menu-frame leaderboard-screen">
        <div className="leaderboard-screen__header">
          <div>
            <span className="eyebrow">
              {t(lang, "rankedGame")}
            </span>
            <h1>{t(lang, "leaderboardTitle")}</h1>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            {t(lang, "back")}
          </button>
        </div>

        <section className="leaderboard-screen__self">
          <strong>{profile.nickname}</strong>
          <span>
            {t(lang, "rating")} {profile.rating}
          </span>
          <span>{rankLabel(lang, rank.id)}</span>
          {snapshot?.userRank ? (
            <span>
              {t(lang, "leaderboardPlace", {
                rank: snapshot.userRank
              })}
            </span>
          ) : null}
        </section>

        {!authorized ? (
          <AuthBenefitCard
            lang={lang}
            onAuthorize={onAuthorize}
            onDismiss={onBack}
          />
        ) : loading ? (
          <p className="leaderboard-screen__state">
            {t(lang, "leaderboardLoading")}
          </p>
        ) : snapshot === null ? (
          <p className="leaderboard-screen__state">
            {t(lang, "leaderboardUnavailable")}
          </p>
        ) : (
          <>
            {forming ? (
              <p className="leaderboard-screen__state">
                {t(lang, "leaderboardForming")}
              </p>
            ) : null}
            <ol className="leaderboard-list">
              {snapshot.entries.map((entry) => (
                <li
                  key={`${entry.rank}-${entry.publicName}-${entry.score}`}
                >
                  <span className="leaderboard-list__rank">
                    {entry.rank}
                  </span>
                  <strong>
                    {entry.publicName ||
                      t(lang, "leaderboardAnonymous")}
                  </strong>
                  <span>{entry.score}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  );
}
