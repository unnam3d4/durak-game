import { useContext, useEffect, useMemo, useState } from "react";
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
import { AuthBenefitCard } from "../ui/AuthBenefitCard";
import { LeaderboardScreen } from "../ui/LeaderboardScreen";
import { MetaHubScreen } from "../ui/MetaHubScreen";
import type { RatingChangeSummary } from "../profile/apply-match-result";
import { GamePlatformContext } from "../platform/game-platform";
import { useYandexLifecycle } from "../platform/use-yandex-lifecycle";
import { syncPlayerProfile } from "../platform/profile-sync";
import { syncPlayerMeta } from "../platform/meta-sync";
import { runInterstitialThen } from "../platform/interstitial";
import { gameAudioPauseService } from "../audio/game-audio";
import type { PlayerMetaV1 } from "../meta/player-meta";
import { loadOrCreatePlayerMeta, savePlayerMeta } from "../meta/meta-storage";
import { applyMetaMatchResult, type MetaMatchDelta } from "../meta/apply-meta-match-result";
import { claimDailyReward } from "../meta/daily-reward";
import { purchaseCosmetic, equipCosmetic } from "../economy/cosmetics";
import type { KeyValueStorage } from "../save/storage";
import {
  normalizeLanguage,
  playersLabel,
  t,
  variantLabel,
  type Language
} from "../i18n/i18n";
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

function savedLaunch(storage: KeyValueStorage): MatchLaunch | null {
  try {
    const saved = loadCurrentMultiplayerMatch(storage);
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

function initialMultiplayerMatch(
  launch: MatchLaunch,
  storage: KeyValueStorage
) {
  try {
    const saved = loadCurrentMultiplayerMatch(storage);
    if (
      launch.resumeExisting &&
      saved?.participants.length === launch.participantCount &&
      saved.variant === launch.variant
    ) {
      return saved;
    }

    if (saved) {
      storage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
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
  meta,
  storage,
  lang,
  onLaunch,
  onLeaderboard,
  onMeta
}: Readonly<{
  profile: PlayerProfileV1;
  meta: PlayerMetaV1;
  storage: KeyValueStorage;
  lang: Language;
  onLaunch: (launch: MatchLaunch) => void;
  onLeaderboard: () => void;
  onMeta: () => void;
}>) {
  const saved = useMemo(() => savedLaunch(storage), [storage]);
  const [variant, setVariant] = useState<MultiplayerVariant>("podkidnoy");
  const [participantCount, setParticipantCount] =
    useState<ParticipantCount>(2);

  return (
    <main className="menu-shell">
      <section className="menu-frame">
        <ProfileSummary profile={profile} coins={meta.coins} lang={lang} />
        <div className="menu-brand">
          <span className="eyebrow">{t(lang, "classicCardGame")}</span>
          <h1>{t(lang, "gameTitle")}</h1>
          <p>{t(lang, "menuDescription")}</p>
        </div>

        <div className="menu-actions">
          {saved ? (
            <button
              type="button"
              className="menu-button menu-button--primary"
              onClick={() => onLaunch(saved)}
            >
              <strong>{t(lang, "continue")}</strong>
              <span>
                {variantLabel(lang, saved.variant)}
                {" · "}
                {playersLabel(lang, saved.participantCount)}
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
            <strong>{t(lang, "quickMatch")}</strong>
            <span>
              {variantLabel(lang, "podkidnoy")} · {playersLabel(lang, 2)}
            </span>
          </button>

          <button
            type="button"
            className="menu-button menu-button--secondary"
            onClick={onLeaderboard}
          >
            <strong>{t(lang, "leaderboardButton")}</strong>
          </button>
          <button
            type="button"
            className="menu-button menu-button--secondary"
            onClick={onMeta}
          >
            <strong>{lang === "ru" ? "Профиль и коллекция" : "Profile & Collection"}</strong>
            <span>◉ {meta.coins}</span>
          </button>
        </div>

        <div
          className="match-config"
          aria-label={t(lang, "modeChoice")}
        >
          <div className="config-block">
            <span className="config-label">{t(lang, "mode")}</span>
            <div className="segmented-control">
              <button
                type="button"
                aria-pressed={variant === "podkidnoy"}
                onClick={() => setVariant("podkidnoy")}
              >
                {variantLabel(lang, "podkidnoy")}
              </button>
              <button
                type="button"
                aria-pressed={variant === "perevodnoy"}
                onClick={() => setVariant("perevodnoy")}
              >
                {variantLabel(lang, "perevodnoy")}
              </button>
            </div>
          </div>

          <div className="config-block">
            <span className="config-label">{t(lang, "atTable")}</span>
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
            <strong>{t(lang, "play")}</strong>
            <span>
              {variantLabel(lang, variant)}
              {" · "}
              {playersLabel(lang, participantCount)}
            </span>
          </button>
        </div>

        <footer className="menu-note">
          <span>{t(lang, "cards36")}</span>
          <span>{t(lang, "noWagering")}</span>
          <span>{t(lang, "rankedGame")}</span>
        </footer>
      </section>
    </main>
  );
}

function MultiplayerGame({
  launch,
  profile,
  meta,
  storage,
  lang,
  onProfileChange,
  onMetaChange,
  onDoubleCoins,
  onGameplayFinished,
  onNewMatch,
  onExitToMenu
}: Readonly<{
  launch: MatchLaunch;
  profile: PlayerProfileV1;
  meta: PlayerMetaV1;
  storage: KeyValueStorage;
  lang: Language;
  onProfileChange: (profile: PlayerProfileV1) => void;
  onMetaChange: (meta: PlayerMetaV1) => void;
  onDoubleCoins?: (coins: number) => Promise<boolean>;
  onGameplayFinished: () => void;
  onNewMatch: (launch: MatchLaunch) => void;
  onExitToMenu: () => void;
}>) {
  const state = useMemo(
    () => initialMultiplayerMatch(launch, storage),
    [launch, storage]
  );
  const context = useMemo<RankedMatchContextV1>(() => {
    if (
      launch.rankedContext &&
      rankedContextMatchesState(launch.rankedContext, state)
    ) {
      return launch.rankedContext;
    }

    try {
      const saved = loadRankedMatchContext(storage);
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
  }, [launch.rankedContext, profile.rating, state, storage]);
  const [ratingChange, setRatingChange] =
    useState<RatingChangeSummary | null>(null);
  const [metaReward, setMetaReward] =
    useState<MetaMatchDelta | null>(null);
  const [rewardedClaimed, setRewardedClaimed] = useState(false);

  const completeMatch = (
    result: Parameters<typeof applyMatchResult>[1]
  ) => {
    onGameplayFinished();

    if (context.ratingEligible) {
      const nowMs = Date.now();
      const applied = applyMatchResult(profile, result, nowMs);
      const metaApplied = applyMetaMatchResult(
        meta,
        {
          variant: launch.variant,
          participantCount: result.participantCount,
          placement: result.placement,
          technicalLoss: result.technicalLoss,
          surrendered: result.surrendered
        },
        nowMs
      );
      onProfileChange(applied.profile);
      onMetaChange(metaApplied.meta);
      setRatingChange(applied.change);
      setMetaReward(metaApplied.delta);
      setRewardedClaimed(false);
    }

    try {
      removeRankedMatchContext(storage);
    } catch {
      // The in-memory context remains sufficient for the result screen.
    }
  };

  return (
    <MultiplayerTableScreen
      initialState={state}
      storage={storage}
      lang={lang}
      opponentRatings={context.opponents.map(
        (opponent) => opponent.hiddenRating
      )}
      opponentProfiles={context.opponents}
      playerNickname={profile.nickname}
      ratingChange={ratingChange}
      metaReward={metaReward}
      rewardedClaimed={rewardedClaimed}
      onDoubleCoins={
        onDoubleCoins
          ? async () => {
              if (
                !metaReward ||
                rewardedClaimed ||
                metaReward.coins <= 0
              ) {
                return;
              }
              const granted = await onDoubleCoins(metaReward.coins);
              if (granted) setRewardedClaimed(true);
            }
          : undefined
      }
      cardBackId={meta.cosmetics.equipped.cardBack}
      tableThemeId={meta.cosmetics.equipped.tableTheme}
      showIntro={!launch.resumeExisting}
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

function initialPlayerProfile(
  storage: KeyValueStorage
): PlayerProfileV1 | null {
  try {
    return loadPlayerProfile(storage);
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

export function App({
  storage: storageOverride,
  lang: langOverride
}: Readonly<{
  storage?: KeyValueStorage;
  lang?: string;
}> = {}) {
  const platform = useContext(GamePlatformContext);
  const lang = normalizeLanguage(
    langOverride ?? platform?.lang ?? "ru"
  );
  const storage =
    storageOverride ?? platform?.storage ?? window.localStorage;
  const queryLaunch = useMemo(previewLaunch, []);
  const [launch, setLaunch] = useState<MatchLaunch | null>(queryLaunch);
  const [profile, setProfile] = useState<PlayerProfileV1 | null>(
    () => initialPlayerProfile(storage)
  );
  const [pendingLaunch, setPendingLaunch] =
    useState<MatchLaunch | null>(null);
  const [search, setSearch] = useState<SearchSession | null>(null);
  const [matchFinished, setMatchFinished] = useState(false);
  const [authDismissed, setAuthDismissed] = useState(false);
  const [authorized, setAuthorized] = useState(
    () => platform?.isAuthorized() ?? false
  );
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [meta, setMeta] = useState<PlayerMetaV1>(
    () => loadOrCreatePlayerMeta(storage, Date.now())
  );

  useEffect(() => {
    if (!platform || !platform.isAuthorized()) return;

    let cancelled = false;
    const localProfile = initialPlayerProfile(storage);

    void syncPlayerProfile(platform, localProfile).then((synced) => {
      if (cancelled || !synced) return;

      setProfile((current) =>
        current === null ||
        synced.updatedAtMs > current.updatedAtMs
          ? synced
          : current
      );
      void platform.setLeaderboardScore(synced.rating);
    });

    void syncPlayerMeta(platform, meta).then((syncedMeta) => {
      if (cancelled || !syncedMeta) return;
      setMeta((current) =>
        syncedMeta.updatedAtMs > current.updatedAtMs
          ? syncedMeta
          : current
      );
    });

    return () => {
      cancelled = true;
    };
  }, [platform, storage]);

  useYandexLifecycle(
    platform,
    launch !== null && !matchFinished,
    gameAudioPauseService
  );

  function persistMetaChange(next: PlayerMetaV1): void {
    try {
      savePlayerMeta(storage, next);
    } catch {
      // Meta remains available for this session if storage is blocked.
    }
    setMeta(next);
    if (platform?.isAuthorized() && platform.saveCloudMeta) {
      void platform.saveCloudMeta(next);
    }
  }

  function persistProfileChange(next: PlayerProfileV1): void {
    try {
      savePlayerProfile(storage, next);
    } catch {
      // Keep the profile in memory when storage is unavailable.
    }

    setProfile(next);

    if (platform?.isAuthorized()) {
      void platform.saveCloudProfile(next);
      void platform.setLeaderboardScore(next.rating);
    }
  }

  if (profile === null) {
    return (
      <NicknameOnboarding
        lang={lang}
        onComplete={(nickname) => {
          persistProfileChange(
            createPlayerProfile(nickname, Date.now())
          );
        }}
      />
    );
  }

  const beginSearch = (next: MatchLaunch) => {
    const seed = createCryptoSeed();
    setMatchFinished(false);
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

  const beginSearchAfterInterstitial = (
    next: MatchLaunch
  ): void => {
    const shouldShowInterstitial =
      profile.matchesCompleted > 0 &&
      profile.matchesCompleted % 2 === 0;

    if (!shouldShowInterstitial) {
      beginSearch(next);
      return;
    }

    void runInterstitialThen(platform, () => beginSearch(next));
  };

  const requestLaunch = (next: MatchLaunch) => {
    if (next.resumeExisting) {
      setMatchFinished(false);
      setLaunch(next);
      return;
    }
    if (savedLaunch(storage)) {
      setPendingLaunch(next);
      return;
    }
    beginSearchAfterInterstitial(next);
  };

  const confirmSurrender = () => {
    if (!pendingLaunch) return;

    try {
      const saved = loadCurrentMultiplayerMatch(storage);
      const context = loadRankedMatchContext(storage);

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
        persistProfileChange(applied.profile);
        const metaApplied = applyMetaMatchResult(
          meta,
          {
            variant: saved.variant,
            participantCount:
              saved.participants.length as ParticipantCount,
            placement: saved.participants.length,
            technicalLoss: false,
            surrendered: true
          },
          Date.now()
        );
        persistMetaChange(metaApplied.meta);
      }

      storage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
      removeRankedMatchContext(storage);
    } catch {
      // If storage is blocked, continue with the in-memory navigation.
    }

    const next = pendingLaunch;
    setPendingLaunch(null);
    beginSearchAfterInterstitial(next);
  };

  const authorizeYandex = async (): Promise<boolean> => {
    if (!platform || platform.kind !== "yandex") return false;

    const success = await platform.authorize();
    if (!success) return false;

    setAuthorized(true);
    const synced = await syncPlayerProfile(platform, profile);
    if (synced) {
      setProfile(synced);
      await platform.setLeaderboardScore(synced.rating);
    }

    const syncedMeta = await syncPlayerMeta(platform, meta);
    if (syncedMeta) {
      setMeta(syncedMeta);
    }
    return true;
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
      saveCurrentMultiplayerMatch(storage, state, Date.now());
      saveRankedMatchContext(storage, rankedContext);
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
    setMatchFinished(false);
    setLaunch(next);
  };

  return launch ? (
    <MultiplayerGame
      launch={launch}
      profile={profile}
      meta={meta}
      storage={storage}
      lang={lang}
      onProfileChange={persistProfileChange}
      onMetaChange={persistMetaChange}
      onDoubleCoins={
        platform?.showRewarded
          ? async (coins) => {
              if (coins <= 0) return false;
              const granted = await platform.showRewarded!();
              if (!granted) return false;

              const next = {
                ...meta,
                coins: meta.coins + coins,
                updatedAtMs: Math.max(meta.updatedAtMs, Date.now())
              };
              persistMetaChange(next);
              return true;
            }
          : undefined
      }
      onGameplayFinished={() => setMatchFinished(true)}
      onNewMatch={beginSearchAfterInterstitial}
      onExitToMenu={() => {
        setMatchFinished(false);
        setLaunch(null);
      }}
    />
  ) : search ? (
    <MatchSearchScreen
      schedule={search.schedule}
      opponents={search.opponents}
      lang={lang}
      onCancel={() => setSearch(null)}
      onComplete={completeSearch}
    />
  ) : metaOpen ? (
    <MetaHubScreen
      profile={profile}
      meta={meta}
      lang={lang}
      onBack={() => setMetaOpen(false)}
      onClaimDaily={() => {
        const claimed = claimDailyReward(meta, Date.now());
        if (claimed.ok) persistMetaChange(claimed.meta);
      }}
      onPurchase={(id) => {
        const purchased = purchaseCosmetic(meta, id, Date.now());
        if (purchased.ok) persistMetaChange(purchased.meta);
      }}
      onEquip={(id) => {
        const equipped = equipCosmetic(meta, id, Date.now());
        if (equipped.ok) persistMetaChange(equipped.meta);
      }}
    />
  ) : leaderboardOpen ? (
    <LeaderboardScreen
      platform={platform}
      profile={profile}
      authorized={authorized}
      lang={lang}
      onAuthorize={authorizeYandex}
      onBack={() => setLeaderboardOpen(false)}
    />
  ) : (
    <>
      <MainMenu
        profile={profile}
        meta={meta}
        storage={storage}
        lang={lang}
        onLaunch={requestLaunch}
        onLeaderboard={() => setLeaderboardOpen(true)}
        onMeta={() => setMetaOpen(true)}
      />
      {platform?.kind === "yandex" &&
      !authorized &&
      !authDismissed ? (
        <AuthBenefitCard
          lang={lang}
          onAuthorize={authorizeYandex}
          onDismiss={() => setAuthDismissed(true)}
        />
      ) : null}
      {pendingLaunch ? (
        <SurrenderDialog
          lang={lang}
          onContinue={() => setPendingLaunch(null)}
          onConfirm={confirmSurrender}
        />
      ) : null}
    </>
  );
}
