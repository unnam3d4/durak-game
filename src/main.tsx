import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { GamePlatformContext } from "./platform/game-platform";
import { initializeGamePlatform } from "./platform/yandex-games";
import { installGameSurfaceGuards } from "./platform/game-surface-guards";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root");
installGameSurfaceGuards(rootElement);
const root = createRoot(rootElement);

async function bootstrap(): Promise<void> {
  const platform = await initializeGamePlatform();

  root.render(
    <StrictMode>
      <GamePlatformContext.Provider value={platform}>
        <App />
      </GamePlatformContext.Provider>
    </StrictMode>
  );
}

void bootstrap();
