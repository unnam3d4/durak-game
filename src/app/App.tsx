import { useMemo, useState } from "react";
import { createMatch1v1 } from "../rules/create-match";
import { loadCurrentMatch } from "../save/match-save";
import { TableScreen } from "../ui/TableScreen";

function randomSeed(): number {
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] ?? Date.now();
  } catch {
    return Date.now() >>> 0;
  }
}

function initialMatch() {
  try {
    return loadCurrentMatch(window.localStorage) ?? createMatch1v1(randomSeed());
  } catch {
    return createMatch1v1(randomSeed());
  }
}

export function App() {
  const first = useMemo(initialMatch, []);
  const [match, setMatch] = useState({ key: 0, state: first });

  const restart = () => {
    try { window.localStorage.removeItem("durak.currentMatch.v1"); } catch {}
    setMatch(({ key }) => ({ key: key + 1, state: createMatch1v1(randomSeed()) }));
  };

  return <TableScreen key={match.key} initialState={match.state} onRestart={restart} />;
}
