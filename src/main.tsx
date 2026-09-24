import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { GamePlatformContext } from "./platform/game-platform";
import { initializeGamePlatform } from "./platform/yandex-games";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

async function bootstrap(): Promise<void> {
  const platform = await initializeGamePlatform();

  createRoot(root).render(
    <StrictMode>
      <GamePlatformContext.Provider value={platform}>
        <App />
      </GamePlatformContext.Provider>
    </StrictMode>
  );
}

void bootstrap();
