# Ranked PvE Release Design

Date: 2026-09-24  
Status: approved canonical release design  
Base commit: `095ef9792657f7e48c3e247b550b74c9eb3e766a`

## 1. Release product shape

Release v1 is a competitive PvE Durak game for Yandex Games.

Supported game rules:
- Podkidnoy Durak.
- Perevodnoy Durak.
- 2, 3, or 4 participants.
- Exactly one real player at the table.
- All other seats are AI-controlled opponents.
- 36-card deck.
- 20-second hard turn limit for the real player.
- AI actions complete within the existing 15-second hard bot ceiling.

No real-time PvP, VPS, WebSocket rooms, friends, account directory, or real-player matchmaking is required for v1.

The competitive layer between real users is rating, rank, progression, and the Yandex leaderboard rather than head-to-head play.

## 2. Player identity

First launch presents:
- heading: `Введите ник`;
- empty input;
- no generated or prefilled nickname;
- 3–16 characters;
- Cyrillic, Latin, digits, underscore;
- normalized validation and abuse filtering.

In v1 without a backend, the local nickname is a display identity, not a globally unique account identifier.

Yandex ID remains optional. The game must remain playable without authorization. Authorization may be offered for benefits such as cloud persistence and participation in the global leaderboard.

## 3. Competitive model

The player has three distinct progression concepts:

### Level
- Driven by XP.
- Never decreases.
- Represents time and long-term progression.

### Rating
- Numeric skill value.
- Increases and decreases according to match results.
- Used to calibrate AI difficulty and leaderboard score.

### Rank / Разряд
- Human-readable tier derived from rating.
- Does not have a separate canonical score.
- Initial concept: numbered ranks progressing toward prestige titles.
- Exact rating thresholds are balance configuration, not hard-coded product copy.

The result screen must show rating movement clearly, for example:
`1376 → 1387 (+11)`.

Promotion to a new rank gets a short celebratory presentation.

A small hysteresis/protection band should prevent immediate promotion-demotion oscillation after one borderline loss.

## 4. Global leaderboard

The global leaderboard contains real Yandex users only.

AI opponents:
- are never inserted into the global leaderboard;
- never receive fabricated global positions;
- never expose fabricated match history, registration date, city, ping, or online presence.

At the game table, an AI opponent may display:
- nickname;
- card count;
- normal seat visuals;
- turn state/timer;
- optional neutral cosmetic treatment.

Do not show a bot's fake leaderboard place or fake globally verifiable profile data.

For a very small initial population, the UI may temporarily emphasize rating/rank while displaying the global table as forming/calibrating rather than highlighting trivial positions such as #1 of 3.

## 5. Match search presentation

Starting a ranked game is not instantaneous.

Flow:
1. Player presses `Найти соперников`.
2. A matchmaking presentation appears.
3. Opponents appear one at a time at randomized times.
4. Total search duration varies naturally.
5. Match transitions directly to the table and dealing sequence.

Timing target:
- usually around 3–7 seconds;
- sometimes faster;
- sometimes around 7–9.5 seconds;
- hard presentation ceiling: 10 seconds.

There is no `Готов` button.

The player can cancel before the match is committed. Cancelling during search has no rating penalty.

The search UI must not fabricate:
- ping;
- network quality;
- cities;
- connection errors;
- online population numbers;
- reconnect behavior.

Use neutral copy such as `Подбираем соперников…`.

## 6. Human-like AI objective

AI is not designed to always choose the mathematically strongest move. It is designed to make legal, plausible, human-like decisions at different skill levels.

Each AI seat receives a persistent per-match personality configuration with parameters such as:
- skill;
- aggression;
- risk tolerance;
- trump conservation;
- pressure tendency;
- memory quality;
- reaction speed;
- mistake tendency;
- transfer tendency;
- throw-in tendency;
- emotional/tilt tendency;
- extremely low voluntary-quit tendency.

Different AI seats must not behave as clones.

The personality remains stable through the match so a player can perceive consistent tendencies.

## 7. AI information boundary

AI may use only:
- its own hand;
- public table cards;
- public discard/history;
- trump;
- talon count;
- public card counts;
- legal actions;
- publicly inferable information accumulated during play.

AI must never read:
- the human player's hidden hand;
- another opponent's hidden hand;
- undealt future deck order;
- any hidden state that a human player could not know.

This remains enforced structurally through the existing public-view boundary.

## 8. AI decision quality

AI move selection should evaluate multiple reasonable legal actions.

Human-like variation comes from:
- personality-weighted scoring;
- incomplete memory;
- small bounded decision noise between near-equivalent actions;
- context-dependent mistakes;
- different strategic preferences.

Do not implement mistakes as a simple unconditional chance to choose any random legal action.

Examples of plausible mistakes:
- spending a valuable trump too early;
- taking when a defense was slightly better;
- defending when taking would preserve a stronger endgame;
- missing an optimal transfer;
- stopping throw-in pressure too early;
- overcommitting to a weak pressure line.

Skill changes the quality and frequency of such decisions without granting hidden information.

## 9. AI timing

No artificial internet lag exists.

AI delay represents decision time only.

Delay depends on:
- number of legal actions;
- position complexity;
- personality reaction speed;
- bounded random variation.

Simple decisions are generally faster; difficult defenses, transfers, and throw-in choices may take longer.

AI must never exceed the 15-second hard action ceiling.

Avoid repeated deterministic timing patterns.

## 10. Rare AI surrender

An AI opponent may very rarely leave/surrender when its position is clearly poor.

This is a behavioral event, not a fake network event.

Requirements:
- extremely low frequency;
- only after meaningful game progress;
- only when position is objectively very poor;
- probability influenced slightly by personality;
- never used to hand the human a scripted win;
- never shown as fake internet loss, reconnect, or technical failure.

Neutral UI copy is acceptable, e.g. `Соперник покинул партию`.

Rating treatment uses normal match-result logic; no special jackpot reward is created.

## 11. Fair deck and first move

The deck remains fair:
- 36 cards;
- unbiased shuffle using the existing secure-seeded flow;
- no dynamic deck manipulation to improve retention or force outcomes.

At match creation, the owner of the lowest trump among initially dealt hands receives the first attacking right.

That participant may lead any legal card; the lowest trump itself does not have to be played.

The rare fallback case where no participant initially holds a trump must be explicitly specified and tested rather than left as an unexplained implementation artifact.

## 12. Match completion and final bout

A match result must not visually interrupt the final bout.

Resolution order:
1. action;
2. defense / take decision;
3. all legally allowed throw-ins;
4. passes or attack cap;
5. visible movement of cards to discard or taker's hand;
6. hand refill when applicable;
7. record participants who have gone out;
8. determine whether more than one active participant remains;
9. either begin the next bout or enter final result presentation.

In 3- and 4-player games, a participant who has gone out keeps the corresponding placement and is removed from active rotation while remaining participants continue.

In 2-player play, do not invent extra fake moves after the rules already determine the loser. Instead, finish the actual final bout visually and only then show the result.

The result overlay must appear only after final gameplay animations are complete.

## 13. Player abandonment and timeout

Closing, reloading, hiding, or temporarily leaving the browser is not an automatic surrender in PvE.

The current match is saved and can be resumed.

If the player explicitly abandons the saved ranked match to start another ranked match, or confirms `Сдаться`:
- current match is scored as the player's last-place result;
- normal rating loss for that result applies;
- win streak resets;
- completion XP/reward is not granted.

Do not add extreme abandonment penalties or queue bans for PvE.

A real-player hard turn timeout remains a technical loss according to the existing product rule. The result must still be presented cleanly rather than visually cutting the table state mid-animation.

## 14. Card interaction

Keep tap/click controls and add drag controls.

Implementation direction:
- use Pointer Events rather than HTML5 drag-and-drop;
- support mouse, touch, and stylus;
- preserve an accessible click/tap path for every action.

Drag behavior:
1. pointer press on playable card;
2. movement threshold distinguishes drag from tap;
3. card lifts visually and follows the pointer;
4. legal drop targets are highlighted;
5. release on valid target submits the same rules-engine action;
6. invalid release animates the card back to hand.

Attack:
- drag card to the battlefield.

Defense:
- drag the defending card onto the specific unbeaten attack card.

Perevodnoy:
- legal transfer interactions must be supported without duplicating game-rule logic in the UI.

The rules engine remains the only authority for legality.

## 15. Visual consistency of seats

All opponent seats use the same visual component contract.

Do not expose AI implementation details through:
- component labels;
- CSS text;
- special card backs;
- special colors;
- instant card teleportation;
- different turn presentation;
- debug strings such as `bot`, `bot2`, or `Соперники — боты`.

Normal product copy must not explicitly claim an AI opponent is a real connected human.

The goal is a coherent table where the interface itself does not reveal implementation details.

## 16. Animation requirements

Gameplay animations are part of the release-quality design.

Required visual transitions include:
- dealing;
- opponent card to table;
- human drag/tap to table;
- defense card placement;
- throw-ins;
- take collection;
- discard collection;
- refill from talon;
- participant finishing;
- final-bout completion;
- result reveal.

Animations must be short enough not to slow down repeated play.

Reduced-motion behavior must remain usable.

## 17. Yandex Games release constraints

The release implementation must preserve the already agreed Yandex Games constraints:
- game playable without mandatory external registration;
- Yandex ID only through supported platform flow;
- SDK initialization and loading lifecycle;
- platform language detection and RU/EN localization layer;
- reliable save/resume;
- responsive desktop/mobile layout;
- correct resize and orientation behavior;
- no unwanted browser context menu in the gameplay surface;
- correct audio/focus lifecycle;
- release monetization through Yandex Games SDK advertising at natural breaks only, never interrupting an active card decision;
- full-screen interstitial calls only from explicit non-gameplay transitions such as starting another match from the result/menu flow;
- Yandex pause/resume events and gameplay/audio state remain synchronized around platform ads and focus changes;
- no system page scrolling or swipe-to-refresh on the main game surface; the complete active table remains usable without page scrolling;
- production archive remains within the current Yandex Games size/file-name constraints;
- no external-backend dependency for v1 gameplay;
- no VPS required for v1.

The current Yandex requirements also prohibit "interactive artificial intelligence". Release v1 therefore uses no generative model, LLM, remote AI service, adaptive model training, or free-form AI interaction. Opponents are deterministic/local rule-based game controllers operating only on legal actions and public game state. Because the platform wording is broad, this distinction must be rechecked against the current official requirement immediately before submission; product/draft copy must not market the feature as interactive AI.

Any platform integration detail that may have changed must be rechecked against current official Yandex Games documentation during implementation and final pre-moderation QA.

## 18. Release scope

Required before v1 submission:
- nickname onboarding;
- profile/progression shell;
- rating and rank;
- Yandex leaderboard integration path;
- human-like AI refinement;
- randomized search presentation;
- final-bout/result sequencing fix;
- abandonment treatment;
- drag-and-drop card controls;
- full visual polish;
- responsive Yandex-ready UI;
- Yandex SDK/lifecycle/localization/save compliance;
- Yandex interstitial advertising at logical pauses and monetization configuration;
- moderation-safe draft metadata that describes ranked competition without claiming real-time PvP;
- production archive/size/input/scroll verification;
- production test/build verification.

Deferred:
- real-player PvP;
- VPS;
- WebSocket;
- friends;
- account search;
- private rooms;
- public real-player matchmaking;
- reconnect for real multiplayer.

## 19. Engineering principles

- Rules engine remains authoritative.
- AI consumes public player views, not raw hidden game state.
- Rating formulas and rank thresholds live in balance/config modules.
- Presentation timing is separate from game-rule timing.
- No release feature may require a future VPS.
- Preserve deterministic simulations where possible for regression testing.
- Add behavior-focused tests before production AI/rule changes.
- Existing save compatibility must be migrated intentionally if the state schema changes.

## 20. Acceptance criteria

The release design is satisfied when:
- all existing rule scenarios remain green;
- first attacker follows the agreed lowest-trump rule;
- AI seats demonstrably use different stable personalities;
- AI never reads hidden information;
- AI move delays are variable and bounded;
- no fake network-lag behavior remains;
- match search takes a variable bounded interval and has no Ready step;
- cancelling search causes no loss;
- the final bout is visibly completed before the result appears;
- abandoning a saved ranked match cannot be used to reroll without a rating consequence;
- cards can be played by both tap and pointer drag;
- no ordinary table UI exposes implementation labels such as bot/bot2;
- global leaderboard data represents real users, not generated AI identities;
- desktop and mobile production builds pass release QA.
