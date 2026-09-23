import { useMemo, useState } from "react";
import type { GameState } from "../core/game-types";
import type {
  MultiplayerGameState,
  MultiplayerVariant
} from "../core/multiplayer-game-types";
import type { ParticipantCount } from "../core/participants";
import { createCryptoSeed } from "../deck/random";
import { createMatch1v1 } from "../rules/create-match";
import { createMultiplayerMatch } from "../rules/create-multiplayer-match";
import {
  CURRENT_MATCH_KEY,
  loadCurrentMatch
} from "../save/match-save";
import {
  CURRENT_MULTIPLAYER_MATCH_KEY,
  loadCurrentMultiplayerMatch
} from "../save/multiplayer-match-save";
import { GameMenu } from "../ui/GameMenu";
import { MultiplayerTableScreen } from "../ui/MultiplayerTableScreen";
import { TableScreen } from "../ui/TableScreen";

type ResumeState =
  | Readonly<{ kind: "classic"; state: GameState }>
  | Readonly<{ kind: "multiplayer"; state: MultiplayerGameState }>;

type Session =
  | Readonly<{ kind: "classic" }>
  | Readonly<{
      kind: "multiplayer";
      participantCount: ParticipantCount;
      variant: MultiplayerVariant;
      initialState?: MultiplayerGameState;
    }>;

function createFreshMatch() {
  return createMatch1v1(createCryptoSeed());
}

function initialClassicMatch() {
  try {
    const saved = loadCurrentMatch(window.localStorage);
    if (saved) return saved;
  } catch {
    // Storage can be unavailable in embedded browsers.
  }
  return createFreshMatch();
}

function ClassicApp({ onExit }: Readonly<{ onExit?: () => void }>) {
  const first = useMemo(initialClassicMatch, []);
  const [match, setMatch] = useState({ key: 0, state: first });

  const restart = () => {
    try {
      window.localStorage.removeItem(CURRENT_MATCH_KEY);
    } catch {
      // Storage can be unavailable; restarting in memory still works.
    }
    setMatch(({ key }) => ({
      key: key + 1,
      state: createFreshMatch()
    }));
  };

  return (
    <TableScreen
      key={match.key}
      initialState={match.state}
      onRestart={restart}
      onExit={onExit}
    />
  );
}

function multiplayerPreviewCount(): ParticipantCount | null {
  const value = new URLSearchParams(window.location.search).get("players");
  if (value === "2") return 2;
  if (value === "3") return 3;
  if (value === "4") return 4;
  return null;
}

function multiplayerPreviewVariant(): MultiplayerVariant {
  const value = new URLSearchParams(window.location.search).get("variant");
  return value === "perevodnoy" ? "perevodnoy" : "podkidnoy";
}

function initialMultiplayerMatch(
  participantCount: ParticipantCount,
  variant: MultiplayerVariant
): MultiplayerGameState {
  try {
    const saved = loadCurrentMultiplayerMatch(window.localStorage);
    if (
      saved?.participants.length === participantCount &&
      saved.variant === variant
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
    participantCount,
    variant
  );
}

function MultiplayerSession({
  participantCount,
  variant,
  initialState,
  onExit
}: Readonly<{
  participantCount: ParticipantCount;
  variant: MultiplayerVariant;
  initialState?: MultiplayerGameState;
  onExit?: () => void;
}>) {
  const first = useMemo(
    () =>
      initialState ??
      createMultiplayerMatch(
        createCryptoSeed(),
        participantCount,
        variant
      ),
    [initialState, participantCount, variant]
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
        participantCount,
        variant
      )
    }));
  };

  return (
    <MultiplayerTableScreen
      key={match.key}
      initialState={match.state}
      onRestart={restart}
      onExit={onExit}
    />
  );
}

function MultiplayerPreview({
  participantCount,
  variant
}: Readonly<{
  participantCount: ParticipantCount;
  variant: MultiplayerVariant;
}>) {
  const first = useMemo(
    () => initialMultiplayerMatch(participantCount, variant),
    [participantCount, variant]
  );

  return (
    <MultiplayerSession
      participantCount={participantCount}
      variant={variant}
      initialState={first}
    />
  );
}

function loadResumeState(): ResumeState | null {
  try {
    const multiplayer = loadCurrentMultiplayerMatch(window.localStorage);
    if (multiplayer) {
      return { kind: "multiplayer", state: multiplayer };
    }

    const classic = loadCurrentMatch(window.localStorage);
    if (classic) {
      return { kind: "classic", state: classic };
    }
  } catch {
    // A blocked storage API should never prevent reaching the menu.
  }

  return null;
}

function clearCurrentSaves(): void {
  try {
    window.localStorage.removeItem(CURRENT_MATCH_KEY);
    window.localStorage.removeItem(CURRENT_MULTIPLAYER_MATCH_KEY);
  } catch {
    // A new in-memory game can still start if storage is unavailable.
  }
}

function participantCountFor(
  state: MultiplayerGameState
): ParticipantCount {
  const count = state.participants.length;
  if (count === 2 || count === 3 || count === 4) return count;
  throw new Error("Unsupported participant count in saved match");
}

export function App() {
  const previewCount = multiplayerPreviewCount();
  const previewVariant = multiplayerPreviewVariant();
  const [resume, setResume] = useState<ResumeState | null>(
    () => loadResumeState()
  );
  const [session, setSession] = useState<Session | null>(null);

  if (previewCount !== null) {
    return (
      <MultiplayerPreview
        participantCount={previewCount}
        variant={previewVariant}
      />
    );
  }

  const exitToMenu = () => {
    setSession(null);
    setResume(loadResumeState());
  };

  if (session?.kind === "classic") {
    return <ClassicApp onExit={exitToMenu} />;
  }

  if (session?.kind === "multiplayer") {
    return (
      <MultiplayerSession
        participantCount={session.participantCount}
        variant={session.variant}
        initialState={session.initialState}
        onExit={exitToMenu}
      />
    );
  }

  const startNew = (
    participantCount: ParticipantCount,
    variant: MultiplayerVariant
  ) => {
    clearCurrentSaves();
    setResume(null);
    setSession({
      kind: "multiplayer",
      participantCount,
      variant
    });
  };

  const continueSaved = () => {
    if (!resume) return;

    if (resume.kind === "classic") {
      setSession({ kind: "classic" });
      return;
    }

    setSession({
      kind: "multiplayer",
      participantCount: participantCountFor(resume.state),
      variant: resume.state.variant,
      initialState: resume.state
    });
  };

  return (
    <GameMenu
      hasResume={resume !== null}
      onResume={continueSaved}
      onQuickMatch={() => startNew(2, "podkidnoy")}
      onStartCustom={startNew}
    />
  );
}
