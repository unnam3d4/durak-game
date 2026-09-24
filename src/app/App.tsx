import { useMemo, useState } from "react";
import { createCryptoSeed } from "../deck/random";
import {
  createOpponentSeatProfiles,
  type OpponentSeatProfile
} from "../matchmaking/opponent-profiles";
import {
  createSearchSchedule,
  type SearchSchedule
} from "../matchmaking/search-schedule";
import type { RankedMatchContextV1 } from "../matchmaking/ranked-match-context";
import {
  INITIAL_RATING,
  type PlayerProfileV1
} from "../profile/player-profile";
import { applyMatchResult } from "../profile/apply-match-result";
import {
  loadPlayerProfile,
  savePlayerProfile
} from "../profile/profile-storage";
import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import type { ParticipantCount } from "../core/participants";
import { createMultiplayerMatch } from "../rules/create-multiplayer-match";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  loadCurrentMultiplayerMatch,
  saveCurrentMultiplayerMatch
} from "../save/multiplayer-match-save";
import {
  loadRankedMatchContext,
  rankedContextMatchesState,
  removeRankedMatchContext,
  saveRankedMatchContext
} from "../save/ranked-match-context-save";
import { MultiplayerTableScreen } from "../ui/MultiplayerTableScreen";
import { NicknameOnboarding } from "../ui/NicknameOnboarding";
import { ProfileSummary } from "../ui/ProfileSummary";
import { SurrenderDialog } from "../ui/SurrenderDialog";
import { MatchSearchScreen } from "../ui/MatchSearchScreen";
import type { RatingChangeSummary } from "../profile/apply-match-result";
import "./app.css";

type MatchLaunch = Readonly<{
  participantCount: ParticipantCount;
  variant: MultiplayerVariant;
  resumeExisting: boolean;
  seed?: number;
  rankedContext?: RankedMatchContextV1;
}>;

type SearchSession = Readonly<{
  launch: MatchLaunch;
  seed: number;
  schedule: SearchSchedule;
  opponents: readonly OpponentSeatProfile[];
}>;

function previewLaunch(): MatchLaunch | null {
  const params = new URLSearchParams(window.location.search);
  const players = params.get("players");
  if (players !== "2" && players !== "3" && players !== "4") {
    return null;
  }

  return {
    participantCount: Number(players) as ParticipantCount,
    variant:
      params.get("variant") === "perevodnoy"
        ? "perevodnoy"
        : "podkidnoy",
    resumeExisting: true
  };
}

function savedLaunch(): MatchLaunch | null {
  try {
    const saved = loadCurrentMultiplayerMatch(window.localStorage);
    if (!saved) return null;

    return {
      participantCount: saved.participants.length as ParticipantCount,
      variant: saved.variant,
      resumeExisting: true
    };
  } catch {
    return null;
  }
}

function initialMultiplayerMatch(launch: MatchLaunch) {
  try {
    const saved = loadCurrentMultiplayerMatch(window.localStorage);
    if (
      launch.resumeExisting &&
      saved?.participants.length === launch.participantCount &&
      saved.variant === launch.variant
    ) {
      return saved;
    }

    if (saved) {
      window.localStorage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
    }
  } catch {
    // Storage can be unavailable; a fresh secure-seeded match still works.
  }

  return createMultiplayerMatch(
    launch.seed ?? createCryptoSeed(),
    launch.participantCount,
    launch.variant
  );
}

function MainMenu({
  profile,
  onLaunch
}: Readonly<{
  profile: PlayerProfileV1;
  onLaunch: (launch: MatchLaunch) => void;
}>) {
  const saved = useMemo(savedLaunch, []);
  const [variant, setVariant] = useState<MultiplayerVariant>("podkidnoy");
  const [participantCount, setParticipantCount] =
    useState<ParticipantCount>(2);

  return (
    <main className="menu-shell">
      <section className="menu-frame">
        <ProfileSummary profile={profile} />
        <div className="menu-brand">
          <span className="eyebrow">Классическая карточная игра</span>
          <h1>Дурак</h1>
          <p>
            Подкидной и переводной. Честная колода, 20 секунд на ход,
            от двух до четырёх игроков.
          </p>
        </div>

        <div className="menu-actions">
          {saved ? (
            <button
              type="button"
              className="menu-button menu-button--primary"
              onClick={() => onLaunch(saved)}
            >
              <strong>Продолжить</strong>
              <span>
                {saved.variant === "perevodnoy" ? "Переводной" : "Подкидной"}
                {" · "}
                {saved.participantCount} игрока
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="menu-button menu-button--primary"
            onClick={() =>
              onLaunch({
                participantCount: 2,
                variant: "podkidnoy",
                resumeExisting: false
              })
            }
          >
            <strong>Быстрый матч</strong>
            <span>Подкидной · 2 игрока</span>
          </button>
        </div>

        <div className="match-config" aria-label="Выбор режима">
          <div className="config-block">
            <span className="config-label">Режим</span>
            <div className="segmented-control">
              <button
                type="button"
                aria-pressed={variant === "podkidnoy"}
                onClick={() => setVariant("podkidnoy")}
              >
                Подкидной
              </button>
              <button
                type="button"
                aria-pressed={variant === "perevodnoy"}
                onClick={() => setVariant("perevodnoy")}
              >
                Переводной
              </button>
            </div>
          </div>

          <div className="config-block">
            <span className="config-label">За столом</span>
            <div className="segmented-control segmented-control--players">
              {([2, 3, 4] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={participantCount === count}
                  onClick={() => setParticipantCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="menu-button menu-button--secondary"
            onClick={() =>
              onLaunch({
                participantCount,
                variant,
                resumeExisting: false
              })
            }
          >
            <strong>Играть</strong>
            <span>
              {variant === "perevodnoy" ? "Переводной" : "Подкидной"}
              {" · "}
              {participantCount} игрока
            </span>
          </button>
        </div>

        <footer className="menu-note">
          <span>36 карт</span>
          <span>Без ставок</span>
          <span>Рейтинговая игра</span>
        </footer>
      </section>
    </main>
  );
}

function MultiplayerGame({
  launch,
  profile,
  onProfileChange,
  onNewMatch,
  onExitToMenu
}: Readonly<{
  launch: MatchLaunch;
  profile: PlayerProfileV1;
  onProfileChange: (profile: PlayerProfileV1) => void;
  onNewMatch: (launch: MatchLaunch) => void;
  onExitToMenu: () => void;
}>) {
  const state = useMemo(
    () => initialMultiplayerMatch(launch),
    [launch]
  );
  const context = useMemo<RankedMatchContextV1>(() => {
    if (
      launch.rankedContext &&
      rankedContextMatchesState(launch.rankedContext, state)
    ) {
      return launch.rankedContext;
    }

    try {
      const saved = loadRankedMatchContext(window.localStorage);
      if (saved && rankedContextMatchesState(saved, state)) {
        return saved;
      }
    } catch {
      // Fall through to an unrated deterministic compatibility context.
    }

    return {
      schemaVersion: 1,
      matchSeed: state.seed,
      participantCount: state.participants.length as ParticipantCount,
      playerRatingAtStart: profile.rating,
      opponents: createOpponentSeatProfiles(
        state.seed,
        state.participants.length as ParticipantCount,
        profile.rating
      ),
      ratingEligible: false
    };
  }, [launch.rankedContext, profile.rating, state]);
  const [ratingChange, setRatingChange] =
    useState<RatingChangeSummary | null>(null);

  const completeMatch = (
    result: Parameters<typeof applyMatchResult>[1]
  ) => {
    if (context.ratingEligible) {
      const applied = applyMatchResult(profile, result, Date.now());
      try {
        savePlayerProfile(window.localStorage, applied.profile);
      } catch {
        // Keep the updated profile in memory when storage is unavailable.
      }
      onProfileChange(applied.profile);
      setRatingChange(applied.change);
    }

    try {
      removeRankedMatchContext(window.localStorage);
    } catch {
      // The in-memory context remains sufficient for the result screen.
    }
  };

  return (
    <MultiplayerTableScreen
      initialState={state}
      opponentRatings={context.opponents.map(
        (opponent) => opponent.hiddenRating
      )}
      opponentProfiles={context.opponents}
      playerNickname={profile.nickname}
      ratingChange={ratingChange}
      onMatchComplete={completeMatch}
      onRestart={() =>
        onNewMatch({
          participantCount: launch.participantCount,
          variant: launch.variant,
          resumeExisting: false
        })
      }
      onExitToMenu={onExitToMenu}
    />
  );
}

function initialPlayerProfile(): PlayerProfileV1 | null {
  try {
    return loadPlayerProfile(window.localStorage);
  } catch {
    return null;
  }
}

function createPlayerProfile(
  nickname: string,
  nowMs: number
): PlayerProfileV1 {
  return {
    schemaVersion: 1,
    nickname,
    xp: 0,
    rating: INITIAL_RATING,
    matchesCompleted: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    createdAtMs: nowMs,
    updatedAtMs: nowMs
  };
}

export function App() {
  const queryLaunch = useMemo(previewLaunch, []);
  const [launch, setLaunch] = useState<MatchLaunch | null>(queryLaunch);
  const [profile, setProfile] = useState<PlayerProfileV1 | null>(
    initialPlayerProfile
  );
  const [pendingLaunch, setPendingLaunch] =
    useState<MatchLaunch | null>(null);
  const [search, setSearch] = useState<SearchSession | null>(null);

  if (profile === null) {
    return (
      <NicknameOnboarding
        onComplete={(nickname) => {
          const next = createPlayerProfile(nickname, Date.now());
          try {
            savePlayerProfile(window.localStorage, next);
          } catch {
            // The profile still works for this session if storage is blocked.
          }
          setProfile(next);
        }}
      />
    );
  }

  const beginSearch = (next: MatchLaunch) => {
    const seed = createCryptoSeed();
    setLaunch(null);
    setSearch({
      launch: {
        participantCount: next.participantCount,
        variant: next.variant,
        resumeExisting: false
      },
      seed,
      schedule: createSearchSchedule(seed, next.participantCount),
      opponents: createOpponentSeatProfiles(
        seed,
        next.participantCount,
        profile.rating
      )
    });
  };

  const requestLaunch = (next: MatchLaunch) => {
    if (next.resumeExisting) {
      setLaunch(next);
      return;
    }
    if (savedLaunch()) {
      setPendingLaunch(next);
      return;
    }
    beginSearch(next);
  };

  const confirmSurrender = () => {
    if (!pendingLaunch) return;

    try {
      const saved = loadCurrentMultiplayerMatch(window.localStorage);
      const context = loadRankedMatchContext(window.localStorage);

      if (
        saved &&
        context &&
        context.ratingEligible &&
        rankedContextMatchesState(context, saved)
      ) {
        const applied = applyMatchResult(
          profile,
          {
            placement: saved.participants.length,
            participantCount:
              saved.participants.length as ParticipantCount,
            opponentRatings: context.opponents.map(
              (opponent) => opponent.hiddenRating
            ),
            technicalLoss: false,
            surrendered: true
          },
          Date.now()
        );
        savePlayerProfile(window.localStorage, applied.profile);
        setProfile(applied.profile);
      }

      window.localStorage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
      removeRankedMatchContext(window.localStorage);
    } catch {
      // If storage is blocked, continue with the in-memory navigation.
    }

    const next = pendingLaunch;
    setPendingLaunch(null);
    beginSearch(next);
  };

  const completeSearch = () => {
    if (!search) return;

    const state = createMultiplayerMatch(
      search.seed,
      search.launch.participantCount,
      search.launch.variant
    );
    const rankedContext: RankedMatchContextV1 = {
      schemaVersion: 1,
      matchSeed: search.seed,
      participantCount: search.launch.participantCount,
      playerRatingAtStart: profile.rating,
      opponents: search.opponents,
      ratingEligible: true
    };

    try {
      saveCurrentMultiplayerMatch(window.localStorage, state, Date.now());
      saveRankedMatchContext(window.localStorage, rankedContext);
    } catch {
      // The in-memory launch remains playable even if storage is unavailable.
    }

    const next: MatchLaunch = {
      ...search.launch,
      resumeExisting: true,
      seed: search.seed,
      rankedContext
    };
    setSearch(null);
    setLaunch(next);
  };

  return launch ? (
    <MultiplayerGame
      launch={launch}
      profile={profile}
      onProfileChange={setProfile}
      onNewMatch={beginSearch}
      onExitToMenu={() => setLaunch(null)}
    />
  ) : search ? (
    <MatchSearchScreen
      schedule={search.schedule}
      opponents={search.opponents}
      onCancel={() => setSearch(null)}
      onComplete={completeSearch}
    />
  ) : (
    <>
      <MainMenu profile={profile} onLaunch={requestLaunch} />
      {pendingLaunch ? (
        <SurrenderDialog
          onContinue={() => setPendingLaunch(null)}
          onConfirm={confirmSurrender}
        />
      ) : null}
    </>
  );
}
