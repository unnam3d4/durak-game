import { useMemo, useState } from "react";
import { createCryptoSeed } from "../deck/random";
import { createMatch1v1 } from "../rules/create-match";
import { loadCurrentMatch } from "../save/match-save";
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

export function App() {
  const first = useMemo(initialMatch, []);
  const [match, setMatch] = useState({ key: 0, state: first });

  const restart = () => {
    try { window.localStorage.removeItem("durak.currentMatch.v1"); } catch {}
    setMatch(({ key }) => ({ key: key + 1, state: createFreshMatch() }));
  };

  return <TableScreen key={match.key} initialState={match.state} onRestart={restart} />;
}
