# Durak Game — Product & Technical Design

Date: 2026-09-23  
Status: Design baseline for implementation  
Repository: `unnam3d4/durak-game`

## 1. Product goal

Build a polished browser card game for Yandex Games around classic Russian Durak.

The product should feel like a real competitive table match even in the first release, while remaining honest about the fact that opponents are computer-controlled until real multiplayer is added later.

Primary goals:

- familiar evergreen gameplay with zero learning barrier for the target audience;
- fair random dealing with no hidden handicap or deck manipulation;
- believable opponents whose strength comes only from decision quality;
- fast repeatable matches;
- long-term profile progression without turning the game into a casino;
- monetization that fits natural pauses and does not interrupt active play;
- premium, clean presentation on both mobile and desktop;
- architecture that can later replace a bot seat with a network-controlled seat.

## 2. Release scope

### Included in v1

- Podkidnoy Durak.
- Perevodnoy Durak.
- 2, 3, or 4 participants.
- 36-card deck.
- One human player; all other seats are computer opponents.
- Required nickname on first launch.
- No avatars.
- 20-second turn timer for every participant.
- Procedurally generated bot personalities.
- Pre-generated curated pool of 20,000 unique bot nicknames.
- Profile level.
- Numeric rank/grade system.
- Coins.
- Cosmetic customization:
  - card backs;
  - table themes;
  - nickname color/style;
  - nickname frame/decorations;
  - earned status badges.
- Match statistics.
- Achievements.
- Win streak.
- Rewarded ads and interstitial ads in compliant pause points.
- Save/restore for profile and unfinished match.
- Russian and English UI.
- Responsive mobile + desktop layout.
- Yandex Games SDK wrapper from the beginning.

### Explicitly excluded from v1

- Real online multiplayer.
- Chat.
- Friends/clans.
- Real-money purchases.
- Betting or wagering the player's coin balance.
- 5–6 player tables.
- 52-card mode.
- Battle pass.
- Seasonal PvP ladders.
- Third-party AI/LLM opponents.

## 3. Player identity

On first launch the player sees one focused prompt:

**“Как тебя зовут за столом?”**

Nickname constraints:

- 3–16 visible characters;
- Cyrillic, Latin letters, digits, underscore;
- whitespace trimmed;
- profanity/abuse filter;
- random fallback nickname is prefilled so the player can continue immediately.

There are no avatars in v1.

Identity at the table is represented by:

- nickname;
- rank;
- optional nickname decoration;
- optional earned badge;
- current card count;
- turn timer.

This preserves table space and makes cosmetic progression focused and inexpensive to produce.

## 4. Match entry

Main actions:

1. **Быстрый матч**
2. **Выбрать режим**
3. **Профиль**
4. **Коллекция**
5. **Достижения**
6. **Настройки**

### Quick match

Default preset:

- Podkidnoy;
- 2 participants;
- 36 cards;
- standard rules.

Transition text may say **“Подготовка стола…”**.

The game must never claim that a real human is being matched when the opponent is a bot.

### Custom match

Player selects:

- mode: Podkidnoy / Perevodnoy;
- participants: 2 / 3 / 4.

Advanced rule toggles can be added later only if telemetry shows demand.

## 5. Turn timer

Every turn has a hard **20-second limit**.

Rules:

- countdown begins only after the previous action animation fully ends;
- first 15 seconds are visually calm;
- final 5 seconds become visibly urgent;
- if the human player reaches 0 seconds without a legal action, the match ends as a technical loss;
- bot seats use the same conceptual turn limit but always commit a move no later than 15 seconds.

No separate “bot speed” setting exists.

## 6. Bot response timing

The bot computes its move immediately, then a presentation-delay model determines when the move is shown.

Delay is dynamic, not fixed.

Inputs include:

- number of legal moves;
- decision ambiguity;
- whether a trump is involved;
- endgame importance;
- transfer/take/defend choice complexity;
- bot personality tempo;
- bounded random jitter.

Typical ranges:

- obvious move: 0.3–1.2 s;
- ordinary choice: 0.8–4 s;
- complex choice: 3–8 s;
- difficult endgame decision: occasionally 8–15 s.

The delay system is purely presentation. It must not alter what information the bot has or the move-quality evaluation.

## 7. Fair randomness

Fair dealing is a product requirement, not an implementation detail.

### Deck generation

- Create exactly 36 unique cards.
- Shuffle once per match using Fisher–Yates.
- Random bytes should come from Web Crypto where available.
- Store a reproducible match/deal identifier for diagnostics.
- Never reshuffle or modify future cards based on player strength, rank, balance, ad behavior, or recent results.

### Information boundary

A bot may know only information available to a human player in the same seat:

- its own hand;
- trump;
- cards currently on the table;
- discard history;
- visible cards previously taken;
- deck size;
- opponents' card counts;
- public turn history.

A bot must not receive another player's hidden hand through its API.

This boundary must be enforced architecturally.

## 8. Rules engine

The rules engine is the authoritative source of legality.

UI, bots, replay/restoration, and future network players must all use the same functions.

Core concept:

`getLegalActions(gameState, playerId)`

No separate legality rules in UI code.

Suggested match state machine:

`DEAL -> ATTACK -> DEFEND -> THROW_IN -> TAKE|BEAT -> DRAW -> NEXT_ROUND -> FINISH`

Every action goes through:

1. legality validation;
2. deterministic state transition;
3. persistence checkpoint;
4. visual animation.

### Podkidnoy baseline

- 6 cards per player after deal/refill.
- Every standalone match starts with the holder of the lowest trump as the first attacker.
- An opening attack may contain one or more cards of the same rank.
- Defender beats a non-trump with a higher card of the same suit or any trump.
- A trump can only be beaten by a higher trump.
- Every later throw-in must match a rank already present on the table, whether attack or defense.
- Total attack cards in one bout are limited to `min(6, defenderHandSizeAtBoutStart)`.
- v1 has no special five-card limit for the first defender; the same six-card cap rule applies in 2/3/4-player matches.
- If the defender takes, all cards from that bout go into the defender's hand.
- If the defense succeeds, all bout cards go to discard.
- Refill order is principal attacker first, then other eligible attackers clockwise, defender last.
- When the talon is exhausted, players who finish their hand at the end of a bout are out. The last participant still holding cards is the Durak.
- If all remaining players empty their hands at the end of the same bout, the match is a draw.

Finish order may be recorded for progression/statistics in 3/4-player matches, but it does not change the classic core objective: the last player holding cards loses.

### Perevodnoy baseline

Same foundation as Podkidnoy, plus:

- before beating any attack card, the defender may transfer the attack by adding one or more cards matching the rank of the current attack;
- once the defender has beaten at least one attack card, that bout can no longer be transferred in v1;
- transfer is legal only when the next defender has enough cards to face the resulting number of attack cards;
- a transferred attack may be transferred again if the same conditions remain legal;
- v1 does not use special “first bout cannot be transferred” or “show a trump without playing it” house rules;
- transfer behavior is resolved by the same state machine, not a parallel game implementation.

Regional/house-rule variants are future options and must be introduced only as explicit settings with their own tests.

## 9. Bot architecture

Single bot engine, many procedural profiles.

The game uses a controller boundary:

- `HumanController`
- `BotController`
- future `NetworkController`

The core game asks a controller for an action and does not care who produced it.

### Procedural bot profile

Each generated opponent has a stable seed and derived traits such as:

- strength;
- risk tolerance;
- trump conservation;
- attack quality;
- defense quality;
- throw-in aggressiveness;
- transfer tendency;
- card-memory quality;
- endgame skill;
- error rate;
- decision tempo.

The same bot seed must recreate the same nickname and personality for a rematch.

Bots in multiplayer matches always optimize for themselves. They may never coordinate against the human player.

### Difficulty progression

Opponent strength should generally track the player's rank with bounded variation so matches are neither trivial nor impossible.

Strength must change move evaluation, not shuffle quality.

## 10. Bot nickname pool

Generate and curate **20,000 unique nicknames** before release.

Requirements:

- natural-looking mix of Cyrillic, Latin, transliterated, casual and gaming-style names;
- majority should look ordinary rather than artificially generated;
- length <= 16 characters;
- no duplicates;
- profanity/abuse filtering;
- exclude extremist references, political bait, impersonation of public figures, obvious trademarks, and other moderation risk;
- avoid excessive template artifacts like every name ending in 777 or _PRO.

The runtime chooses from this fixed validated pool.

A bot seed binds the chosen nickname to that opponent for rematches and recurring encounters.

## 11. Progression

Three independent concepts:

### Level

Represents activity and never decreases.

Example XP sources:

- finish match;
- win;
- win streak milestone;
- 3- or 4-player placement.

Level unlocks cosmetic content.

### Rank

Represents performance and may rise or fall.

Preferred naming is numeric grades, not Bronze/Silver/Gold.

Baseline structure:

- 10th grade;
- 9th;
- ...;
- 1st;
- Master.

Exact rating thresholds and gains/losses are balance data, not hard-coded domain rules.

### Statistics

Track at minimum:

- matches played;
- wins;
- losses;
- win rate;
- current streak;
- best streak;
- stats by Podkidnoy/Perevodnoy;
- stats by 2/3/4 participants.

## 12. Economy

Coins are soft currency.

### v1 rule: no wagering

Players do not stake and lose their existing coin balance based on match outcome.

Reason:

- reduces moderation/compliance risk;
- keeps the product clearly positioned as a classic card game rather than casino-like wagering;
- avoids hard-locking users out of play.

Coins are earned through:

- match completion;
- wins;
- placement in 3/4-player matches;
- streak milestones;
- achievements;
- daily reward;
- optional rewarded ads.

Coins are spent on cosmetic customization only.

No cosmetic provides gameplay advantage.

## 13. Cosmetic system

Primary sinks:

- card backs;
- table themes;
- nickname color;
- nickname frame;
- nickname effects;
- cosmetic badges/emblems.

Some status cosmetics should be achievement-only and not purchasable with coins.

This preserves visible prestige.

## 14. Advertising design

Advertising must never interrupt an active turn.

### Rewarded placements

Examples:

- double or bonus coins after a win;
- bonus coins after a loss;
- double daily reward;
- optional cosmetic reward box;
- streak milestone bonus.

Rewarded viewing is optional and must never be required to continue playing.

### Interstitial placement

Allowed only at logical breaks after a completed match.

Product policy:

- no interstitial during first two completed matches;
- apply both match-count and time cooldowns;
- do not request an interstitial immediately after a rewarded ad;
- never show before the result screen has been understood by the player.

### Sticky banner

Use only on non-gameplay screens such as menu, collection, profile, and settings.

Hide during the active table.

## 15. Visual direction

The game should look commercial and polished from early playable builds.

Visual goals:

- premium but not casino-like;
- dark green / graphite table direction;
- highly readable large cards;
- restrained gold/light accents;
- clean depth, shadows, and card motion;
- minimal visual clutter;
- no avatars;
- nickname and table cosmetics provide personality;
- mobile layout is primary, desktop adapts elegantly.

Asset production will use original generated artwork plus manual iteration/selection.

No competitor art, branded card backs, or copied UI assets.

## 16. Technology

Recommended stack:

- TypeScript;
- React;
- Vite;
- Vitest;
- CSS/SVG/DOM transforms for card rendering and animation;
- no heavyweight game engine for v1.

Rationale:

- only dozens of visual objects;
- UI-heavy game;
- easy responsive layout;
- strong testing ergonomics;
- simple Yandex SDK integration;
- small build size.

## 17. Module boundaries

Suggested top-level modules:

- `core/` — pure domain model and game state.
- `rules/` — legal action generation and transitions.
- `deck/` — cards, shuffle, deal identity.
- `bots/` — bot evaluation and profile generation.
- `controllers/` — human/bot/future network controller interfaces.
- `progression/` — XP, rank, achievements, streaks.
- `economy/` — coins and cosmetic unlocks.
- `save/` — versioned persistence and match restoration.
- `platform/yandex/` — SDK, ads, player/cloud hooks, locale, lifecycle.
- `analytics/` — product events and fairness telemetry.
- `ui/` — React views and interaction layer.
- `data/` — nickname pool and balance tables.
- `tests/` — integration/simulation coverage.

Core rules must not import React, Yandex SDK, ads, or storage code.

## 18. Persistence

Persist after every meaningful state transition.

Save at minimum:

- nickname;
- level/XP;
- rank/rating;
- coins;
- unlocked/equipped cosmetics;
- stats;
- achievements;
- settings;
- current unfinished match;
- bot seed/profile for an active match.

Use a versioned save schema.

Local guest save is required from day one.

Yandex account/cloud sync can be added behind the save abstraction without changing game rules.

On startup, if an unfinished valid match exists, offer to continue it.

## 19. Yandex integration boundary

Create a single adapter/service for:

- SDK initialization;
- lifecycle/game-ready signal;
- language;
- focus pause/resume;
- rewarded ads;
- interstitial ads;
- sticky banner;
- optional account/cloud APIs;
- platform diagnostics.

Game rules must be runnable in tests without the Yandex SDK.

Current Yandex requirements must be re-verified against official documentation before release submission.

## 20. Testing strategy

This project is rules-heavy; automated tests are mandatory.

### Unit tests

Cover:

- deck uniqueness;
- shuffle/deal invariants;
- attack legality;
- defense legality;
- trump behavior;
- throw-ins;
- take/beat transitions;
- draw order;
- transfer legality;
- player elimination/placement;
- timeout loss;
- save/restore equivalence.

### Property/invariant tests

Across many randomized matches:

- exactly 36 unique cards exist;
- no card exists in two zones at once;
- no illegal action is accepted;
- card count is conserved;
- match always reaches a terminal state;
- bots never receive hidden opponent hands.

### Simulation tests

Run bot-vs-bot batches to detect:

- deadlocks;
- impossible states;
- pathological match length;
- seat-position bias;
- unexpected difficulty spikes.

Before production release, target a large automated simulation run (order of 100k matches) once runtime is cheap enough.

## 21. Fairness telemetry

Collect aggregate diagnostics for development and balance:

- starting trump count by seat;
- win rate by seat;
- win rate by bot strength;
- match duration;
- timeout rate;
- average deck exhaustion point;
- rank progression.

Telemetry is observational only. It must never feed back into deck manipulation.

## 22. Delivery milestones

### Milestone A — foundation + 1v1 Podkidnoy vertical slice

- project scaffolding;
- pure 36-card model;
- shuffle/deal;
- authoritative rule engine;
- 1 human + 1 basic bot;
- 20-second timer;
- basic save/restore;
- presentable first table UI;
- tests.

### Milestone B — complete v1 rules

- Perevodnoy;
- 3/4 participants;
- procedural bot profiles;
- stable bot delays;
- results/placement;
- broader simulations.

### Milestone C — progression and identity

- first-run nickname;
- level;
- rank;
- stats;
- achievements;
- win streak;
- 20k nickname dataset.

### Milestone D — economy and presentation

- coins;
- cosmetic inventory;
- card backs/tables/nickname decoration;
- generated polished assets;
- final motion/audio pass.

### Milestone E — Yandex release integration

- SDK lifecycle;
- ads;
- locale;
- mobile/desktop QA;
- persistence checks;
- moderation checklist;
- release package.

## 23. Success criteria for v1

The release candidate is acceptable only if:

- rules are correct across supported modes;
- no deck manipulation exists;
- bot hidden-information boundary is testable;
- no reproducible save-loss bug remains;
- 20-second timer behaves consistently;
- bot visible reaction time feels varied but never exceeds 15 seconds;
- table is comfortable on common mobile sizes and desktop;
- active gameplay is never interrupted by ads;
- first launch to first playable turn is fast and understandable;
- automated simulations complete without deadlocks or invalid states;
- visual quality is cohesive enough to publish without “temporary dev UI”.

## 24. Future online path

Future real multiplayer should replace a seat controller, not the game engine.

Target interface:

`PlayerController -> requestAction(publicState) -> GameAction`

Today:

`BotController`

Future:

`NetworkController`

Server-authoritative networking, matchmaking, reconnect, anti-cheat, and real PvP rating are separate future work and intentionally excluded from v1.
