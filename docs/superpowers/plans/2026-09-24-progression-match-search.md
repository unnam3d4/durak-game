# Progression, Rating, Profile, and Match Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add nickname onboarding, persistent player progression, simple rating/rank feedback, honest real-user leaderboard data boundaries, and a randomized pre-match opponent search presentation.

**Architecture:** Store a versioned local profile independently from the current-match save. Keep rating math pure and configurable, derive rank and level rather than duplicating them in storage, and model search timing as deterministic data so UI timing is testable. Yandex cloud persistence and actual leaderboard transport are adapters added by the later platform plan.

**Tech Stack:** TypeScript, React, Vitest, Testing Library.

**Spec:** docs/superpowers/specs/2026-09-24-ranked-pve-release-design.md

## Global Constraints

- Nickname input is empty on first launch.
- Local nickname is not advertised as globally unique in v1.
- Level never decreases; rating may increase or decrease.
- Rank is derived from rating.
- AI global leaderboard places do not exist.
- v1 rating/leaderboard is client-computed and therefore best-effort against deliberate DevTools tampering; do not describe it as cheat-proof or server-authoritative.
- Search has no Ready button and completes within 10 seconds.
- Cancelling search before match commit has no rating effect.
- Explicitly abandoning an existing ranked match to start another counts as last place.

## Review Focus

- Corrupt profile JSON must not delete or alter a valid current match save.
- A rating loss must never make leaderboard score negative when sent later to Yandex.
- Rank hysteresis must not permanently trap a player in a rank after large rating changes.
- Search for 2/3/4 participants must create exactly 1/2/3 opponent reveals and all must occur before completion.
- Starting a new ranked game while a save exists must require explicit surrender confirmation, never silently erase the save.

---

### Task 1: Add versioned player profile and nickname onboarding

**Files:**
- Create: src/profile/player-profile.ts
- Create: src/profile/profile-storage.ts
- Create: tests/profile/profile-storage.test.ts
- Create: src/ui/NicknameOnboarding.tsx
- Create: tests/ui/NicknameOnboarding.test.tsx
- Modify: src/app/App.tsx
- Modify: tests/app/App.test.tsx

**Interfaces:**
- Produces: PlayerProfileV1
- Produces: loadPlayerProfile(storage), savePlayerProfile(storage, profile)
- Produces: validateNickname(value)

~~~ts
export type PlayerProfileV1 = Readonly<{
  schemaVersion: 1;
  nickname: string;
  xp: number;
  rating: number;
  matchesCompleted: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  createdAtMs: number;
  updatedAtMs: number;
}>;

export const PLAYER_PROFILE_KEY = "durak.playerProfile.v1";
export const INITIAL_RATING = 1000;
~~~

- [ ] **Step 1: Write RED validation/storage tests**

Test:
- empty nickname rejected;
- length 3..16 accepted;
- only Cyrillic, Latin, digits, underscore accepted;
- leading/trailing whitespace trimmed before validation;
- Unicode normalization is applied before checking blocked words;
- blocked obscene/abusive stems are rejected case-insensitively;
- benign names that merely contain short overlapping letters are not rejected;
- corrupt profile returns null and leaves CURRENT_MULTIPLAYER_MATCH_KEY untouched.

- [ ] **Step 2: Run focused tests**

Run: npm test -- tests/profile/profile-storage.test.ts  
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement profile/storage and nickname normalization**

Use KeyValueStorage from src/save/storage.ts. Implement normalizeNickname(value) as trim -> Unicode NFKC -> lowercase key generation while preserving the normalized display casing. Validate display value against /^[A-Za-zА-Яа-яЁё0-9_]{3,16}$/u.

Create src/profile/nickname-filter.ts with an explicit deterministic moderation key and blocked patterns:

~~~ts
const BLOCKED_PATTERNS = [
  /х(?:у|y)[йиеё]/iu,
  /п[иi]зд/iu,
  /[еёe]б(?:а|о|у|л|н|т)/iu,
  /бл(?:я|иа)[дт]/iu,
  /п[иi]д(?:о|а)р/iu,
  /гандон/iu,
  /fuck/iu,
  /shit/iu,
  /bitch/iu,
  /cunt/iu
] as const;

export function nicknameModerationKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll("0", "o")
    .replaceAll("1", "i");
}
~~~

validateNickname tests every blocked pattern plus underscore/number evasions such as "п_и_з_д" and "sh1t". Also include benign regression names such as "assassin", "classic", and "Сусанин" so broad substring filtering is not introduced accidentally. Keep the filter local and deterministic; do not call an external moderation service.

Validate every numeric profile field as finite and nonnegative except rating, which must be finite and then clamped to a minimum of 0.

- [ ] **Step 4: Write RED onboarding UI tests**

~~~tsx
render(<NicknameOnboarding onComplete={onComplete} />);
expect(screen.getByRole("textbox")).toHaveValue("");
fireEvent.change(screen.getByRole("textbox"), { target: { value: "Vovan_77" } });
fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
expect(onComplete).toHaveBeenCalledWith("Vovan_77");
~~~

- [ ] **Step 5: Implement onboarding and App gate**

App loads profile first. When missing, render NicknameOnboarding. On completion create a PlayerProfileV1 with INITIAL_RATING and zero progression, save it, then show the main menu.

- [ ] **Step 6: Run profile/App tests**

Run: npm test -- tests/profile/profile-storage.test.ts tests/ui/NicknameOnboarding.test.tsx tests/app/App.test.tsx  
Expected: PASS after updating old App tests to seed a profile when they intend to test the menu directly.

- [ ] **Step 7: Commit**

~~~bash
git add src/profile src/ui/NicknameOnboarding.tsx src/app/App.tsx tests/profile tests/ui/NicknameOnboarding.test.tsx tests/app/App.test.tsx
git commit -m "feat: add player profile and nickname onboarding"
~~~

### Task 2: Add rating, level, and rank as pure balance functions

**Files:**
- Create: src/profile/progression.ts
- Create: src/profile/rating.ts
- Create: tests/profile/progression.test.ts
- Create: tests/profile/rating.test.ts

**Interfaces:**
- Produces: levelForXp(xp)
- Produces: rankForRating(rating, previousRank?)
- Produces: calculateRatingDelta(input)

Define release rank bands:

~~~ts
export const RANKS = [
  { id: "10", label: "10-й разряд", min: 0 },
  { id: "9", label: "9-й разряд", min: 1100 },
  { id: "8", label: "8-й разряд", min: 1200 },
  { id: "7", label: "7-й разряд", min: 1300 },
  { id: "6", label: "6-й разряд", min: 1400 },
  { id: "5", label: "5-й разряд", min: 1500 },
  { id: "4", label: "4-й разряд", min: 1600 },
  { id: "3", label: "3-й разряд", min: 1700 },
  { id: "2", label: "2-й разряд", min: 1800 },
  { id: "1", label: "1-й разряд", min: 1900 },
  { id: "candidate", label: "Кандидат", min: 2050 },
  { id: "master", label: "Мастер", min: 2200 },
  { id: "grandmaster", label: "Гроссмейстер", min: 2400 }
] as const;
~~~

Use a 25-point demotion hysteresis only when previousRank is provided.

- [ ] **Step 1: Write RED rank/level tests**

Cover exact thresholds, just below thresholds, hysteresis, large drops, and monotonically increasing levelForXp.

- [ ] **Step 2: Run tests and verify RED**

Run: npm test -- tests/profile/progression.test.ts  
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement progression functions**

Use a simple XP curve:

~~~ts
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}
~~~

Rank is derived from numeric rating and optional previous rank.

- [ ] **Step 4: Write RED rating tests**

Use pairwise outcome scoring against hidden AI strengths. Release coefficients:
- K = 24 for 2-player;
- K = 18 per pair in 3-player;
- K = 14 per pair in 4-player;
- clamp total delta to -32..+32.

Test that beating stronger opponents gains more than beating weaker opponents and that last place loses rating.

- [ ] **Step 5: Implement rating calculation**

Represent result input explicitly:

~~~ts
export type RatingResultInput = Readonly<{
  playerRating: number;
  placement: number;
  participantCount: 2 | 3 | 4;
  opponentRatings: readonly number[];
}>;
~~~

Convert placement into pairwise wins/losses in seat-independent order, use an Elo expected-score function for each opponent, sum weighted deltas, round, then clamp.

- [ ] **Step 6: Run profile math tests**

Run: npm test -- tests/profile/progression.test.ts tests/profile/rating.test.ts  
Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add src/profile/progression.ts src/profile/rating.ts tests/profile
git commit -m "feat: add rating and rank progression"
~~~

### Task 3: Apply match results to the persistent profile

**Files:**
- Create: src/profile/apply-match-result.ts
- Create: tests/profile/apply-match-result.test.ts
- Modify: src/ui/MultiplayerTableScreen.tsx
- Modify: src/app/App.tsx

**Interfaces:**
- Consumes: PlayerProfileV1, MatchResultSummary
- Produces: updated PlayerProfileV1 plus RatingChangeSummary

~~~ts
export type MatchResultSummary = Readonly<{
  placement: number;
  participantCount: 2 | 3 | 4;
  opponentRatings: readonly number[];
  technicalLoss: boolean;
  surrendered: boolean;
}>;

export type RatingChangeSummary = Readonly<{
  before: number;
  after: number;
  delta: number;
  rankBefore: string;
  rankAfter: string;
  xpGained: number;
}>;
~~~

- [ ] **Step 1: Write RED result tests**

Cover:
- win increments matchesCompleted/wins/streak and grants XP;
- non-win resets streak;
- surrender/technical loss grants zero completion XP;
- rating is clamped to >= 0;
- bestStreak only increases.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/profile/apply-match-result.test.ts  
Expected: FAIL.

- [ ] **Step 3: Implement applyMatchResult**

XP release values:
- first place: 100;
- second: 60;
- third: 35;
- last: 20;
- technical loss/surrender: 0.

Compute rating through calculateRatingDelta, then derive ranks for summary.

- [ ] **Step 4: Integrate one-shot result application**

App owns the profile and passes onMatchComplete callback into MultiplayerTableScreen. Add a ref or result id guard so the same finished state cannot apply rewards twice across re-renders.

- [ ] **Step 5: Run focused UI/profile tests**

Run: npm test -- tests/profile/apply-match-result.test.ts tests/ui/MultiplayerTableScreen.test.tsx tests/app/App.test.tsx  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/profile src/app/App.tsx src/ui/MultiplayerTableScreen.tsx tests
git commit -m "feat: persist ranked match results"
~~~

### Task 4: Show progression and rating in the menu and result flow

**Files:**
- Create: src/ui/ProfileSummary.tsx
- Create: tests/ui/ProfileSummary.test.tsx
- Modify: src/ui/ResultOverlay.tsx
- Modify: tests/ui/MultiplayerTableScreen.test.tsx
- Modify: src/app/App.tsx
- Modify: tests/app/App.test.tsx

**Interfaces:**
- ProfileSummary consumes PlayerProfileV1 and derives level/rank.
- ResultOverlay receives RatingChangeSummary | null.

- [ ] **Step 1: Write RED profile-summary tests**

~~~tsx
const profile: PlayerProfileV1 = {
  schemaVersion: 1,
  nickname: "Vovan_77",
  xp: 900,
  rating: 1376,
  matchesCompleted: 12,
  wins: 5,
  currentStreak: 2,
  bestStreak: 4,
  createdAtMs: 1,
  updatedAtMs: 2
};

render(<ProfileSummary profile={profile} />);
expect(screen.getByText("Vovan_77")).toBeInTheDocument();
expect(screen.getByText(/Рейтинг 1376/)).toBeInTheDocument();
expect(screen.getByText(/7-й разряд/)).toBeInTheDocument();
~~~

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/ui/ProfileSummary.test.tsx  
Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement ProfileSummary**

Show nickname, derived level, numeric rating, derived rank, and current streak. Do not show a fabricated global place. Keep the component compact enough for the main menu header/profile area.

- [ ] **Step 4: Add RED result-overlay tests**

For RatingChangeSummary { before: 1376, after: 1387, delta: 11 }, assert the finished dialog contains "1376 → 1387" and "+11". Add a promotion case where rankBefore !== rankAfter and assert a "Новый разряд" treatment plus the new rank label.

- [ ] **Step 5: Implement result rating presentation**

Pass the one-shot RatingChangeSummary produced by App into ResultOverlay. A rank promotion gets a short celebratory CSS state but must not delay the ability to start a new match.

- [ ] **Step 6: Integrate ProfileSummary into App menu**

The main menu shows the local player's progression before matchmaking. Global leaderboard place is displayed only by the later LeaderboardScreen using real Yandex data.

- [ ] **Step 7: Run profile/result/App tests**

Run: npm test -- tests/ui/ProfileSummary.test.tsx tests/ui/MultiplayerTableScreen.test.tsx tests/app/App.test.tsx  
Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add src/ui/ProfileSummary.tsx src/ui/ResultOverlay.tsx src/app/App.tsx tests
git commit -m "feat: show rating and rank progression"
~~~

### Task 5: Enforce explicit surrender before replacing a saved ranked match

**Files:**
- Create: src/ui/SurrenderDialog.tsx
- Create: tests/ui/SurrenderDialog.test.tsx
- Modify: src/app/App.tsx
- Modify: tests/app/App.test.tsx

**Interfaces:**
- Produces: confirm surrender flow before clearing CURRENT_MULTIPLAYER_MATCH_KEY.

- [ ] **Step 1: Add RED App test**

Seed a profile and saved unfinished match. Click a new-match action. Assert the old save still exists and a dialog states that abandoning counts as a loss. Only after confirming surrender is the result applied and a new search allowed.

- [ ] **Step 2: Run App tests and verify RED**

Run: npm test -- tests/app/App.test.tsx  
Expected: FAIL because new matches currently replace saves without confirmation.

- [ ] **Step 3: Implement SurrenderDialog and App state**

Buttons:
- "Продолжить партию" closes dialog;
- "Сдаться и начать новую" applies a surrendered last-place result, removes current match save, then enters search.

- [ ] **Step 4: Run App/UI tests**

Run: npm test -- tests/app/App.test.tsx tests/ui/SurrenderDialog.test.tsx  
Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/ui/SurrenderDialog.tsx src/app/App.tsx tests
git commit -m "feat: score explicit abandonment as a loss"
~~~

### Task 6: Add deterministic randomized opponent search schedules

**Files:**
- Create: src/matchmaking/search-schedule.ts
- Create: tests/matchmaking/search-schedule.test.ts
- Create: src/matchmaking/opponent-profiles.ts
- Create: tests/matchmaking/opponent-profiles.test.ts

**Interfaces:**
- Produces: createSearchSchedule(seed, participantCount)
- Produces: createOpponentSeatProfiles(seed, participantCount, playerRating)

~~~ts
export type SearchReveal = Readonly<{
  participantId: Exclude<ParticipantId, "human">;
  revealAtMs: number;
}>;

export type SearchSchedule = Readonly<{
  reveals: readonly SearchReveal[];
  completeAtMs: number;
}>;
~~~

- [ ] **Step 1: Write RED schedule tests**

For each participant count:
- reveal count equals participantCount - 1;
- each revealAtMs > 0;
- reveal times are strictly increasing;
- completeAtMs >= final reveal;
- completeAtMs <= 10_000;
- same seed gives same schedule;
- several seeds produce more than one total duration.

- [ ] **Step 2: Run schedule tests**

Run: npm test -- tests/matchmaking/search-schedule.test.ts  
Expected: FAIL.

- [ ] **Step 3: Implement schedule generation**

Use seeded random. Target duration 1,500..9,500 ms, biased toward 3,000..7,000 ms. Spread reveal times across the duration while enforcing at least 250 ms separation.

- [ ] **Step 4: Write RED opponent-profile tests**

Ensure:
- nicknames are unique within a table;
- names never equal "Соперник 1/2/3";
- hidden AI target ratings are near playerRating with bounded spread;
- displayed profile does not contain globalRank, city, ping, online, or matchHistory fields.

- [ ] **Step 5: Implement opponent profile generation**

~~~ts
export type OpponentSeatProfile = Readonly<{
  participantId: Exclude<ParticipantId, "human">;
  nickname: string;
  hiddenRating: number;
  skill: BotSkill;
}>;
~~~

Use a curated nickname pool and deterministic seeded selection without replacement.

Map hiddenRating to the current bot skill band in one pure helper so UI/matchmaking/controller code cannot disagree:

~~~ts
export function botSkillForRating(rating: number): BotSkill {
  if (rating < 1200) return "easy";
  if (rating < 1750) return "normal";
  return "hard";
}
~~~

Opponent hidden ratings are sampled around the player's start rating with a bounded spread of ±180 and clamped to 800..2400. createOpponentSeatProfiles stores both hiddenRating and the derived skill.

- [ ] **Step 6: Run matchmaking tests**

Run: npm test -- tests/matchmaking  
Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add src/matchmaking tests/matchmaking
git commit -m "feat: add ranked opponent search model"
~~~

### Task 7: Persist ranked-match context independently from rule state

**Files:**
- Create: src/matchmaking/ranked-match-context.ts
- Create: src/save/ranked-match-context-save.ts
- Create: tests/save/ranked-match-context-save.test.ts
- Modify: src/app/App.tsx
- Modify: tests/app/App.test.tsx

**Interfaces:**
- Produces: RankedMatchContextV1
- Produces: saveRankedMatchContext(storage, context), loadRankedMatchContext(storage)

~~~ts
export type RankedMatchContextV1 = Readonly<{
  schemaVersion: 1;
  matchSeed: number;
  participantCount: 2 | 3 | 4;
  playerRatingAtStart: number;
  opponents: readonly OpponentSeatProfile[];
  ratingEligible: boolean;
}>;

export const CURRENT_RANKED_CONTEXT_KEY =
  "durak.currentRankedContext.v1";
~~~

- [ ] **Step 1: Write RED context-save tests**

Cover:
- round-trip preserves opponent nicknames and hidden ratings exactly;
- wrong seed/participantCount can be detected against a loaded rule state;
- corrupt context returns null without removing the rule-state save;
- removing a completed/abandoned match removes both keys.

- [ ] **Step 2: Run focused tests**

Run: npm test -- tests/save/ranked-match-context-save.test.ts  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement context validation and storage**

Validate unique participantIds, unique nicknames after lowercase normalization, finite nonnegative hidden ratings, matching participant count, and schemaVersion 1.

- [ ] **Step 4: Save context when search commits the match**

The search completion handler creates the rule state and RankedMatchContextV1 together, then persists both before rendering the table. Cancelling search writes neither.

When MultiplayerGame constructs each computer controller, it must use the corresponding persisted OpponentSeatProfile.skill plus the match seed/participant id to create that seat's stable personality. Do not default every opponent to hard difficulty.

- [ ] **Step 5: Resume with the exact saved opponent identities**

When a rule save exists:
- if matching ranked context exists, use its opponent nicknames/ratings;
- if no context exists because the save predates this release plan, regenerate deterministic opponent presentation from state.seed and mark ratingEligible false so a legacy/dev save cannot award or remove rating unexpectedly.

- [ ] **Step 6: Use context for rating result, AI configuration, and surrender calculation**

MatchResultSummary.opponentRatings comes from context.opponents, never from freshly generated data. MultiplayerTableScreen receives the same context for seat nicknames and controller skills. Explicit abandonment also uses this stored context.

- [ ] **Step 7: Run save/App tests**

Run: npm test -- tests/save/ranked-match-context-save.test.ts tests/app/App.test.tsx tests/profile/apply-match-result.test.ts  
Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add src/matchmaking/ranked-match-context.ts src/save/ranked-match-context-save.ts src/app/App.tsx tests
git commit -m "feat: persist ranked match context"
~~~

### Task 8: Add MatchSearchScreen and route all new games through it

**Files:**
- Create: src/ui/MatchSearchScreen.tsx
- Create: tests/ui/MatchSearchScreen.test.tsx
- Modify: src/app/App.tsx
- Modify: tests/app/App.test.tsx

**Interfaces:**
- Consumes: SearchSchedule, OpponentSeatProfile[], onCancel, onComplete
- Produces: transition into MultiplayerGame with the selected opponent metadata.

- [ ] **Step 1: Write RED screen tests with fake timers**

Assert:
- initial copy is "Подбираем соперников…";
- opponents appear only after their reveal times;
- Cancel works before complete;
- no "Готов" button exists;
- complete callback fires once at completeAtMs.

- [ ] **Step 2: Run focused test**

Run: npm test -- tests/ui/MatchSearchScreen.test.tsx  
Expected: FAIL.

- [ ] **Step 3: Implement MatchSearchScreen**

Use one interval or scheduled timeouts derived entirely from SearchSchedule. Clear all timers on cancel/unmount. Render neutral empty seat placeholders and revealed nicknames.

- [ ] **Step 4: Integrate App flow**

Change new-match flow:
menu -> search -> table.

Resume existing match skips search and goes directly to table.

Direct preview links remain development-only and may skip search to keep tests/debug fast.

- [ ] **Step 5: Run App/search tests**

Run: npm test -- tests/ui/MatchSearchScreen.test.tsx tests/app/App.test.tsx  
Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/ui/MatchSearchScreen.tsx src/app/App.tsx tests
git commit -m "feat: add randomized opponent search presentation"
~~~

### Task 9: Progression/search checkpoint

- [ ] Run: npm test -- tests/profile tests/matchmaking tests/app tests/ui
- [ ] Run: npm test
- [ ] Run: npm run typecheck
- [ ] Run: npm run build
