import { useMemo, useState } from "react";
import { createCryptoSeed } from "../deck/random";
import type { ParticipantCount } from "../core/participants";
import { createMatch1v1 } from "../rules/create-match";
import { createMultiplayerMatch } from "../rules/create-multiplayer-match";
import { loadCurrentMatch } from "../save/match-save";
import { MultiplayerTableScreen } from "../ui/MultiplayerTableScreen";
import { TableScreen } from "../ui/TableScreen";

function createFreshMatch() {
  return createMatch1v1(createCryptoSeed());
}

function initialMatch() {
  try {
    const saved = loadCurrentMatch(window.localStorage);
    if (saved) return saved;
  } catch {
    // Storage can be unavailable in embedded browsers. A fresh fair match
    // still uses a Web Crypto seed instead of falling back to the clock.
  }
  return createFreshMatch();
}

function ClassicApp() {
  const first = useMemo(initialMatch, []);
  const [match, setMatch] = useState({ key: 0, state: first });

  const restart = () => {
    try {
      window.localStorage.removeItem("durak.currentMatch.v1");
    } catch {
      // Storage can be unavailable; restarting the in-memory match still works.
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

function MultiplayerPreview({
  participantCount
}: Readonly<{ participantCount: ParticipantCount }>) {
  const first = useMemo(
    () => createMultiplayerMatch(createCryptoSeed(), participantCount),
    [participantCount]
  );
  const [match, setMatch] = useState({ key: 0, state: first });

  const restart = () => {
    setMatch(({ key }) => ({
      key: key + 1,
      state: createMultiplayerMatch(createCryptoSeed(), participantCount)
    }));
  };

  return (
    <MultiplayerTableScreen
      key={match.key}
      initialState={match.state}
      onRestart={restart}
    />
  );
}

export function App() {
  const participantCount = multiplayerPreviewCount();
  return participantCount === null ? (
    <ClassicApp />
  ) : (
    <MultiplayerPreview participantCount={participantCount} />
  );
}
