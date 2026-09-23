import { useMemo, useState } from "react";
import { createCryptoSeed } from "../deck/random";
import {
  INITIAL_RATING,
  type PlayerProfileV1
} from "../profile/player-profile";
import {
  loadPlayerProfile,
  savePlayerProfile
} from "../profile/profile-storage";
import type { MultiplayerVariant } from "../core/multiplayer-game-types";
import type { ParticipantCount } from "../core/participants";
import { createMultiplayerMatch } from "../rules/create-multiplayer-match";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  loadCurrentMultiplayerMatch
} from "../save/multiplayer-match-save";
import { MultiplayerTableScreen } from "../ui/MultiplayerTableScreen";
import { NicknameOnboarding } from "../ui/NicknameOnboarding";
import { ProfileSummary } from "../ui/ProfileSummary";
import "./app.css";

type MatchLaunch = Readonly<{
  participantCount: ParticipantCount;
  variant: MultiplayerVariant;
  resumeExisting: boolean;
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
    createCryptoSeed(),
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
          <span>Соперники — боты</span>
        </footer>
      </section>
    </main>
  );
}

function MultiplayerGame({
  launch,
  onExitToMenu
}: Readonly<{
  launch: MatchLaunch;
  onExitToMenu: () => void;
}>) {
  const first = useMemo(
    () => initialMultiplayerMatch(launch),
    [launch]
  );
  const [match, setMatch] = useState({ key: 0, state: first });

  const restart = () => {
    try {
      window.localStorage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
    } catch {
      // Storage can be unavailable; restarting in memory still works.
    }

    setMatch(({ key }) => ({
      key: key + 1,
      state: createMultiplayerMatch(
        createCryptoSeed(),
        launch.participantCount,
        launch.variant
      )
    }));
  };

  return (
    <MultiplayerTableScreen
      key={match.key}
      initialState={match.state}
      onRestart={restart}
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

  return launch ? (
    <MultiplayerGame launch={launch} onExitToMenu={() => setLaunch(null)} />
  ) : (
    <MainMenu profile={profile} onLaunch={setLaunch} />
  );
}
