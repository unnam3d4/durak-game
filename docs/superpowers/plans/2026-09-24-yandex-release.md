# Yandex Games Integration and Release QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Integrate Yandex Games SDK lifecycle, guest-safe storage, optional authorization, real-user leaderboard transport, RU/EN localization hooks, focus/audio handling, and moderation-critical browser behavior without making gameplay depend on platform availability.

**Architecture:** Introduce a thin platform adapter with an explicit unavailable fallback for local/GitHub Pages development. The app consumes platform capabilities through typed interfaces; profile/rules/UI remain platform-agnostic. Yandex-specific calls are centralized and mockable.

**Tech Stack:** Yandex Games SDK, @types/ysdk, React, TypeScript, Vitest.

**Spec:** docs/superpowers/specs/2026-09-24-ranked-pve-release-design.md

## Global Constraints

- SDK integration follows current official Yandex Games documentation verified at implementation time.
- Game starts and remains playable without authorization.
- Authorization dialog opens only after an explicit user click and explanatory benefit copy.
- LoadingAPI.ready is called only after the interactive UI is ready.
- GameplayAPI.start/stop reflects actual gameplay and pauses/stops for menus, result screens, ads, and focus loss.
- Language starts from ysdk.environment.i18n.lang with RU/EN fallback.
- Yandex leaderboard setScore is used only when authorized and available.
- Guest/local fallback must not lose existing profile or current-match saves.
- Context menu/long-press browser menu is disabled in the game interaction surface.
- Fullscreen ads are invoked only from non-gameplay transitions such as starting the next match from menu/result, never during an active card decision.
- The main game surface must not require system page scrolling and must suppress swipe-to-refresh/overscroll without breaking nickname input.
- The production archive must satisfy current Yandex size/root/filename requirements.
- Release copy must describe ranked competition truthfully and must not claim real-time PvP or connected human opponents.
- Opponents are local deterministic/rule-based controllers only: no LLM, generative model, remote AI service, adaptive model training, or free-form AI interaction. Recheck the current broad Yandex "interactive AI" restriction immediately before submission.

## Review Focus

- SDK script missing or YaGames.init rejection must fall back without a blank screen.
- Guest safeStorage failure must fall back to window.localStorage without deleting data.
- Repeated finished-state renders must not spam leaderboard setScore more than once.
- Auth cancellation must return to the game and not repeatedly reopen the dialog.
- Focus loss during a match must stop platform gameplay markup/audio while preserving the local saved match.
- An ad close/error/no-show callback must continue the intended menu/result transition exactly once.
- Yandex archive loading must work from a relative base instead of assuming the GitHub Pages /durak-game/ path.

---

## External release preflight — do this in parallel now

This is a Console/account prerequisite, not a code task. Current Yandex quick-start documentation says a developer agreement is required before a game can be submitted to moderation. Because the owner is in the Russian Federation, do not assume that adding ad SDK calls is enough to receive revenue.

Before the final code task:
- open Yandex Games Console -> Profile/Documents/monetization;
- confirm the developer agreement/status actually allows moderation submission;
- confirm the available cooperation form for this account (for example self-employed/IP/other form presented by Yandex);
- complete required YAN/unified-license monetization setup if the Console requests it;
- do not block code development while Yandex verifies account paperwork, because some account-status changes can take working days.

No credentials, tax identifiers, or payment details belong in the repository.


### Task 1: Add typed Yandex platform adapter with graceful fallback

**Files:**
- Modify: package.json
- Modify: index.html
- Create: src/platform/game-platform.ts
- Create: src/platform/yandex-games.ts
- Create: tests/platform/yandex-games.test.ts
- Modify: src/main.tsx

**Interfaces:**
- Produces: GamePlatform

~~~ts
export type LeaderboardEntryView = Readonly<{
  rank: number;
  score: number;
  publicName: string;
}>;

export type LeaderboardSnapshot = Readonly<{
  entries: readonly LeaderboardEntryView[];
  userRank: number | null;
}>;

export type GamePlatform = Readonly<{
  kind: "yandex" | "standalone";
  lang: string;
  storage: KeyValueStorage;
  isAuthorized: () => boolean;
  loadingReady: () => void;
  gameplayStart: () => void;
  gameplayStop: () => void;
  authorize: () => Promise<boolean>;
  saveCloudProfile: (profile: PlayerProfileV1) => Promise<void>;
  loadCloudProfile: () => Promise<PlayerProfileV1 | null>;
  setLeaderboardScore: (score: number) => Promise<void>;
  getLeaderboard: () => Promise<LeaderboardSnapshot | null>;
  showInterstitial: () => Promise<void>;
  onPlatformPause: (listener: () => void) => () => void;
  onPlatformResume: (listener: () => void) => () => void;
}>;
~~~

- [ ] **Step 1: Install official SDK types**

Run: npm install --save-dev @types/ysdk

- [ ] **Step 2: Add the Yandex SDK script**

In index.html before the module script:

~~~html
<script src="/sdk.js"></script>
~~~

Keep the adapter tolerant of YaGames being undefined so GitHub Pages/local dev still works.

- [ ] **Step 3: Write RED fallback tests**

Mock globalThis.YaGames as undefined and assert initializeGamePlatform returns kind standalone, lang ru, and working storage.

Mock YaGames.init rejection and assert the same fallback.

- [ ] **Step 4: Run focused test**

Run: npm test -- tests/platform/yandex-games.test.ts  
Expected: FAIL.

- [ ] **Step 5: Implement initializeGamePlatform**

On successful YaGames.init:
- read ysdk.environment.i18n.lang;
- await ysdk.getStorage() with localStorage fallback;
- await ysdk.getPlayer() with guest-safe catch;
- keep the current player reference private inside the adapter;
- implement isAuthorized() against that current player;
- expose wrappers rather than the raw SDK;
- implement onPlatformPause/onPlatformResume with ysdk.on("game_api_pause" | "game_api_resume", listener) and matching ysdk.off cleanup;
- make standalone subscriptions return no-op unsubscribe functions.

Do not call openAuthDialog during initialization. authorize() may refresh the private player reference only after the explicit user-triggered auth flow succeeds.

- [ ] **Step 6: Bootstrap platform before App**

main.tsx awaits initializeGamePlatform, then renders App through a PlatformProvider or explicit prop.

- [ ] **Step 7: Run platform tests/typecheck**

Run: npm test -- tests/platform/yandex-games.test.ts  
Run: npm run typecheck  
Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add package.json package-lock.json index.html src/platform src/main.tsx tests/platform
git commit -m "feat: add Yandex Games platform adapter"
~~~

### Task 2: Move profile/match storage to platform-provided safe storage

**Files:**
- Modify: src/app/App.tsx
- Modify: src/ui/MultiplayerTableScreen.tsx
- Modify: tests/app/App.test.tsx
- Modify: tests/ui/MultiplayerTableScreen.test.tsx

**Interfaces:**
- App receives GamePlatform.storage and passes KeyValueStorage to save/resume boundaries.
- MultiplayerTableScreen no longer hard-codes window.localStorage.

- [ ] **Step 1: Add RED storage injection tests**

Provide an in-memory KeyValueStorage to App/Table and assert profile and current match are written there while window.localStorage remains untouched.

- [ ] **Step 2: Run tests and verify RED**

Run: npm test -- tests/app/App.test.tsx tests/ui/MultiplayerTableScreen.test.tsx  
Expected: FAIL due to hard-coded window.localStorage.

- [ ] **Step 3: Inject storage**

Thread platform.storage through App, initialMultiplayerMatch, savedLaunch, and MultiplayerTableScreen. Keep default test helpers simple by providing memory storage explicitly.

- [ ] **Step 4: Run save/App/UI tests**

Run: npm test -- tests/save tests/app tests/ui/MultiplayerTableScreen.test.tsx  
Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/app/App.tsx src/ui/MultiplayerTableScreen.tsx tests
git commit -m "refactor: use platform safe storage"
~~~

### Task 3: Implement loading/gameplay lifecycle and focus handling

**Files:**
- Create: src/platform/use-yandex-lifecycle.ts
- Create: tests/platform/use-yandex-lifecycle.test.tsx
- Modify: src/app/App.tsx

**Interfaces:**
- Consumes: GamePlatform and app screen state
- Produces no UI; emits platform lifecycle calls exactly once per transition.

- [ ] **Step 1: Write RED lifecycle tests**

Mock platform methods and assert:
- loadingReady once after first interactive render;
- gameplayStart on entering active match;
- gameplayStop when returning to menu;
- gameplayStop on document hidden/window blur;
- gameplayStart after visible/focus only when match is still active;
- result screen is stopped gameplay.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/platform/use-yandex-lifecycle.test.tsx  
Expected: FAIL.

- [ ] **Step 3: Implement lifecycle hook**

Use refs to deduplicate calls. Subscribe through platform.onPlatformPause/onPlatformResume (which wraps current Yandex game_api_pause/game_api_resume events) and use visibilitychange/focus/blur as browser fallbacks. Do not change the match save/timer rules solely for markup calls.

- [ ] **Step 4: Add audio pause contract**

Create a small audio service interface even if the release currently has no music. On platform pause/focus loss, call audio.pauseAll(); on return, do not autoplay unless audio was already enabled by user interaction.

- [ ] **Step 5: Run lifecycle tests**

Run: npm test -- tests/platform/use-yandex-lifecycle.test.tsx  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/platform src/app/App.tsx tests/platform
git commit -m "feat: integrate Yandex gameplay lifecycle"
~~~

### Task 4: Add RU/EN localization boundary

**Files:**
- Create: src/i18n/messages.ts
- Create: src/i18n/i18n.ts
- Create: tests/i18n/i18n.test.ts
- Modify: src/app/App.tsx
- Modify: src/ui/NicknameOnboarding.tsx
- Modify: src/ui/MatchSearchScreen.tsx
- Modify: src/ui/MultiplayerTableScreen.tsx
- Modify: src/ui/ResultOverlay.tsx

**Interfaces:**
- Produces: normalizeLanguage(lang): "ru" | "en"
- Produces: t(lang, key, params?)

- [ ] **Step 1: Write RED language tests**

Assert:
- ru -> ru;
- en -> en;
- tr/de/unknown -> en fallback;
- all required release keys exist in both dictionaries.

- [ ] **Step 2: Run focused tests**

Run: npm test -- tests/i18n/i18n.test.ts  
Expected: FAIL.

- [ ] **Step 3: Implement dictionary and helper**

Translate all release-visible strings in menu, onboarding, search, table statuses, surrender, result, profile/rating, and auth offer. Keep card suit accessibility labels localized.

- [ ] **Step 4: Thread platform.lang through UI**

Do not read navigator.language when Yandex platform.lang is available.

- [ ] **Step 5: Run UI/i18n tests**

Run: npm test -- tests/i18n tests/app tests/ui  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/i18n src/app src/ui tests/i18n tests/app tests/ui
git commit -m "feat: add RU and EN localization"
~~~

### Task 5: Add optional Yandex authorization offer

**Files:**
- Create: src/ui/AuthBenefitCard.tsx
- Create: tests/ui/AuthBenefitCard.test.tsx
- Modify: src/app/App.tsx

**Interfaces:**
- Explicit button invokes platform.authorize().
- No automatic authorization dialog.

- [ ] **Step 1: Write RED auth tests**

Assert:
- unauthorized guest sees optional benefit card in profile/rating context, not a blocking startup modal;
- clicking "Войти через Яндекс" calls authorize exactly once;
- clicking "Позже" dismisses without blocking play;
- authorized platform does not show the offer.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/ui/AuthBenefitCard.test.tsx  
Expected: FAIL.

- [ ] **Step 3: Implement benefit copy and flow**

Russian benefit copy: "Войдите через Яндекс, чтобы сохранять прогресс между устройствами и участвовать в общем рейтинге." Provide "Войти через Яндекс" and "Позже".

- [ ] **Step 4: After successful authorization, refresh player capability**

The adapter re-fetches ysdk.getPlayer() only after openAuthDialog resolves successfully and updates isAuthorized through platform state/context.

- [ ] **Step 5: Run auth/App tests**

Run: npm test -- tests/ui/AuthBenefitCard.test.tsx tests/app/App.test.tsx tests/platform/yandex-games.test.ts  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/ui/AuthBenefitCard.tsx src/app/App.tsx src/platform tests
git commit -m "feat: add optional Yandex authorization"
~~~

### Task 6: Add cloud profile sync and real-user leaderboard

**Files:**
- Create: src/platform/profile-sync.ts
- Create: src/platform/leaderboard.ts
- Create: tests/platform/profile-sync.test.ts
- Create: tests/platform/leaderboard.test.ts
- Create: src/ui/LeaderboardScreen.tsx
- Create: tests/ui/LeaderboardScreen.test.tsx
- Modify: src/app/App.tsx

**Interfaces:**
- Leaderboard technical name: rating.
- setLeaderboardScore uses nonnegative integer player rating.
- getLeaderboard returns only Yandex-provided entries.

- [ ] **Step 1: Write RED leaderboard adapter tests**

Mock ysdk.isAvailableMethod and ysdk.leaderboards:
- unauthorized -> set score is a no-op;
- unavailable method -> no-op;
- authorized + available -> setScore("rating", Math.max(0, Math.round(rating)));
- getEntries requests quantityTop 10, quantityAround 3, includeUser true.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/platform/leaderboard.test.ts  
Expected: FAIL.

- [ ] **Step 3: Implement leaderboard adapter**

Respect current Yandex method limits by writing score only after a completed rated match or explicit sync, never on render/timer ticks.

- [ ] **Step 4: Write profile-sync tests**

Merge policy:
- choose profile with larger updatedAtMs when both local and cloud schema v1 are valid;
- never overwrite valid local data with corrupt cloud data;
- after successful merge, persist chosen profile locally and to cloud for authorized users.

- [ ] **Step 5: Implement profile sync through player.getData/setData**

Store under a single durakProfileV1 object key. Use flush true after completed match/promotion and false for noncritical UI changes if needed.

- [ ] **Step 6: Implement LeaderboardScreen**

Show Yandex-provided public names/ranks only. If unauthorized, show the auth benefit action. Define "forming" for v1 as fewer than 10 returned public entries: show neutral "Рейтинг формируется" and the player's own numeric rating/rank, but do not invent missing rows or fabricate an absolute global place.

- [ ] **Step 7: Run platform/UI tests**

Run: npm test -- tests/platform/profile-sync.test.ts tests/platform/leaderboard.test.ts tests/ui/LeaderboardScreen.test.tsx  
Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add src/platform src/ui/LeaderboardScreen.tsx src/app/App.tsx tests
git commit -m "feat: sync progression and real-user leaderboard"
~~~

### Task 7: Add Yandex fullscreen ads at logical pauses

**Files:**
- Modify: src/platform/yandex-games.ts
- Modify: tests/platform/yandex-games.test.ts
- Create: src/platform/interstitial.ts
- Create: tests/platform/interstitial.test.ts
- Modify: src/app/App.tsx
- Modify: tests/app/App.test.tsx

**Interfaces:**
- GamePlatform.showInterstitial(): Promise<void>
- Produces: runInterstitialThen(platform, continuation): Promise<void>

- [ ] **Step 1: Write RED adapter tests for showFullscreenAdv**

Mock ysdk.adv.showFullscreenAdv and assert:
- standalone/unavailable SDK resolves immediately;
- onClose resolves once;
- onError resolves once;
- duplicate callback delivery cannot resolve/continue twice.

- [ ] **Step 2: Run focused platform test**

Run: npm test -- tests/platform/yandex-games.test.ts tests/platform/interstitial.test.ts  
Expected: FAIL until the wrapper exists.

- [ ] **Step 3: Implement the adapter wrapper**

Use the current Yandex SDK form:

~~~ts
await new Promise<void>((resolve) => {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    resolve();
  };

  ysdk.adv.showFullscreenAdv({
    callbacks: {
      onClose: finish,
      onError: finish
    }
  });
});
~~~

Do not invent an app-side ad-frequency timer; Yandex controls whether the fullscreen ad is actually shown.

- [ ] **Step 4: Write RED App flow tests**

From the result/menu state, click the user action that starts the next ranked match. Assert:
- showInterstitial is called before entering MatchSearchScreen;
- search starts after the ad promise resolves;
- clicking active in-game card controls never invokes showInterstitial;
- ad error/no-show still proceeds to search exactly once.

- [ ] **Step 5: Integrate at a non-gameplay transition**

Call showInterstitial only from an explicit menu/result transition into a new match. Do not call it from bot turns, human card actions, timeout handlers, save/resume, or initial loading.

- [ ] **Step 6: Run App/platform tests**

Run: npm test -- tests/platform/interstitial.test.ts tests/platform/yandex-games.test.ts tests/app/App.test.tsx  
Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add src/platform/yandex-games.ts src/platform/interstitial.ts src/app/App.tsx tests/platform tests/app
git commit -m "feat: show Yandex ads between matches"
~~~

### Task 8: Add moderation-critical browser behavior

**Files:**
- Create: src/platform/game-surface-guards.ts
- Create: tests/platform/game-surface-guards.test.ts
- Modify: src/main.tsx or App root wiring

**Interfaces:**
- Guards only the game surface, not arbitrary browser content outside the app.

- [ ] **Step 1: Write RED event tests**

Dispatch contextmenu from inside the game root and assert preventDefault. Dispatch outside the root and assert it is not intercepted.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/platform/game-surface-guards.test.ts  
Expected: FAIL.

- [ ] **Step 3: Implement guards**

Prevent contextmenu on the game root. Use CSS user-select/touch-callout controls only where needed for cards/table so text inputs such as nickname remain usable.

- [ ] **Step 4: Run platform/UI tests**

Run: npm test -- tests/platform tests/ui  
Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/platform src/main.tsx src/app src/ui tests/platform
git commit -m "fix: satisfy game-surface moderation interactions"
~~~

### Task 9: Make the production archive Yandex-safe

**Files:**
- Modify: vite.config.ts
- Modify: package.json
- Modify: src/app/app.css
- Modify: src/ui/table.css
- Create: scripts/verify-yandex-build.mjs
- Create: tests/build/yandex-build-contract.test.ts
- Create: docs/release/yandex-draft-checklist.md

**Interfaces:**
- Produces a relative-path production build that works from an uploaded archive.
- Produces npm script verify:yandex-build.

- [ ] **Step 1: Write RED build-contract tests**

Assert the intended Vite config/build contract uses a relative base for production assets rather than hard-coding "/durak-game/". Keep GitHub Pages functional because relative assets resolve from /durak-game/ as well.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/build/yandex-build-contract.test.ts  
Expected: FAIL against the current hard-coded base.

- [ ] **Step 3: Switch Vite production base to relative assets**

Use:

~~~ts
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: "es2022" }
});
~~~

Do not introduce client-side pathname routing that would make relative assets ambiguous.

- [ ] **Step 4: Prevent system page scroll and overscroll on the game shell**

Set html/body/#root to the available embedded area, remove body margin, use overflow: hidden and overscroll-behavior: none for the main app shell. Allow scrolling only inside an explicit local panel if a secondary screen truly needs it. Preserve normal text input selection and keyboard behavior in nickname onboarding.

- [ ] **Step 5: Implement scripts/verify-yandex-build.mjs**

The script reads dist recursively and fails when:
- index.html is not at dist/index.html;
- any file or directory name contains whitespace or Cyrillic characters;
- uncompressed total exceeds 100 * 1024 * 1024 bytes;
- generated index.html contains "/durak-game/" asset references.

Add package script:

~~~json
"verify:yandex-build": "npm run build && node scripts/verify-yandex-build.mjs"
~~~

- [ ] **Step 6: Add exact draft checklist**

docs/release/yandex-draft-checklist.md must include:
- game starts as guest;
- no required external registration;
- no page scroll/swipe refresh in gameplay;
- mouse/touch controls;
- portrait/landscape resize;
- right-click/long-press;
- LoadingAPI and GameplayAPI markers;
- Yandex pause/resume;
- RU/EN;
- save/reload;
- optional authorization;
- leaderboard real-user-only behavior;
- interstitial between matches only;
- archive verification;
- store/draft text must not say opponents are real online players;
- immediately recheck the current rule about "interactive artificial intelligence"; release uses local rule-based controllers only and contains no generative/LLM/remote AI feature.

- [ ] **Step 7: Run archive verification**

Run: npm run verify:yandex-build  
Expected: PASS and print total uncompressed bytes.

- [ ] **Step 8: Commit**

~~~bash
git add vite.config.ts package.json src/app/app.css src/ui/table.css scripts/verify-yandex-build.mjs tests/build/yandex-build-contract.test.ts docs/release/yandex-draft-checklist.md
git commit -m "build: prepare Yandex Games release archive"
~~~

### Task 10: Final Yandex and release verification

- [ ] Recheck the current official Yandex Games pages for SDK connection, authorization, Player data, Leaderboards, LoadingAPI/GameplayAPI, fullscreen ads, pause/resume events, environment language, requirements, moderation, archive limits, and the current "interactive artificial intelligence" wording before changing Console settings. If current official wording creates a plausible moderation conflict with local rule-based opponents, stop submission and resolve the interpretation before publishing rather than hiding the mechanic.
- [ ] Create/configure the Console leaderboard with technical name rating and descending numeric score.
- [ ] Run npm test and record exact file/test totals.
- [ ] Run npm run typecheck.
- [ ] Run npm run build.
- [ ] Run npm run verify:yandex-build and record the exact uncompressed size.
- [ ] Upload the production archive to a Yandex Games draft.
- [ ] In Draft/debug mode verify SDK initializes, Loading indicator reaches ready, gameplay indicator starts/stops correctly, RU/EN follows platform language, guest play works, explicit auth works, safeStorage survives reload, leaderboard contains only real Yandex entries, and focus loss stops audio/gameplay markup.
- [ ] Verify right-click and long-press do not open the browser context menu inside the game surface.
- [ ] Verify portrait/landscape resize does not lose progress or break interaction.
- [ ] Verify Yandex monetization is enabled and fullscreen ads occur only at menu/result natural breaks, never during an active card decision; verify close/error/no-show continues the intended transition exactly once.
- [ ] Verify the store/draft description accurately describes Podkidnoy/Perevodnoy ranked play and does not state or imply real-time PvP or connected human opponents.
- [ ] Request final whole-branch code review and resolve all blocking findings before merge/submission.
