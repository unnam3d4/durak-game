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

## Review Focus

- SDK script missing or YaGames.init rejection must fall back without a blank screen.
- Guest safeStorage failure must fall back to window.localStorage without deleting data.
- Repeated finished-state renders must not spam leaderboard setScore more than once.
- Auth cancellation must return to the game and not repeatedly reopen the dialog.
- Focus loss during a match must stop platform gameplay markup/audio while preserving the local saved match.

---

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
export type GamePlatform = Readonly<{
  kind: "yandex" | "standalone";
  lang: string;
  storage: KeyValueStorage;
  isAuthorized: boolean;
  loadingReady: () => void;
  gameplayStart: () => void;
  gameplayStop: () => void;
  authorize: () => Promise<boolean>;
  saveCloudProfile: (profile: PlayerProfileV1) => Promise<void>;
  loadCloudProfile: () => Promise<PlayerProfileV1 | null>;
  setLeaderboardScore: (score: number) => Promise<void>;
  getLeaderboard: () => Promise<LeaderboardSnapshot | null>;
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
- expose wrappers rather than the raw SDK.

Do not call openAuthDialog during initialization.

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

Use refs to deduplicate calls. Listen to visibilitychange, focus, blur, plus Yandex game_api_pause/game_api_resume if exposed by the platform environment. Do not change the match save/timer rules solely for markup calls.

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

Show Yandex-provided public names/ranks only. If unauthorized, show the auth benefit action. If the leaderboard is unavailable or tiny/forming, show neutral "Рейтинг формируется" rather than fabricated rows.

- [ ] **Step 7: Run platform/UI tests**

Run: npm test -- tests/platform/profile-sync.test.ts tests/platform/leaderboard.test.ts tests/ui/LeaderboardScreen.test.tsx  
Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add src/platform src/ui/LeaderboardScreen.tsx src/app/App.tsx tests
git commit -m "feat: sync progression and real-user leaderboard"
~~~

### Task 7: Add moderation-critical browser behavior

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

### Task 8: Final Yandex and release verification

- [ ] Recheck the current official Yandex Games pages for SDK connection, authorization, Player data, Leaderboards, LoadingAPI/GameplayAPI, environment language, requirements, and moderation before changing Console settings.
- [ ] Create/configure the Console leaderboard with technical name rating and descending numeric score.
- [ ] Run npm test and record exact file/test totals.
- [ ] Run npm run typecheck.
- [ ] Run npm run build.
- [ ] Upload the production archive to a Yandex Games draft.
- [ ] In Draft/debug mode verify SDK initializes, Loading indicator reaches ready, gameplay indicator starts/stops correctly, RU/EN follows platform language, guest play works, explicit auth works, safeStorage survives reload, leaderboard contains only real Yandex entries, and focus loss stops audio/gameplay markup.
- [ ] Verify right-click and long-press do not open the browser context menu inside the game surface.
- [ ] Verify portrait/landscape resize does not lose progress or break interaction.
- [ ] Verify ads, if enabled for release, occur only at menu/result natural breaks and never during an active card decision.
- [ ] Request final whole-branch code review and resolve all blocking findings before merge/submission.
