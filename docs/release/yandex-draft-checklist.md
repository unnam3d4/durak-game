# Yandex Games draft checklist

Use this checklist for the production archive and Yandex Draft/debug pass.

- [ ] Game starts as a guest without required external registration.
- [ ] Nickname onboarding remains usable with normal text selection and keyboard input.
- [ ] Gameplay has no document-level page scroll or swipe-to-refresh.
- [ ] Mouse, touch, and pointer drag/tap card controls work.
- [ ] Portrait and landscape resize keep the current match playable.
- [ ] Right-click and long-press do not open browser context menus on the game surface.
- [ ] LoadingAPI.ready() is reached after app bootstrap.
- [ ] GameplayAPI.start()/stop() match active gameplay rather than menus/results.
- [ ] Yandex game_api_pause/game_api_resume and browser blur/visibility pause correctly.
- [ ] RU/EN copy follows the platform language with English fallback for unsupported languages.
- [ ] Safe storage survives save/reload and an unfinished ranked match can resume.
- [ ] Yandex authorization is optional and opens only after an explicit user action.
- [ ] Cloud profile sync never replaces valid local data with corrupt cloud data.
- [ ] Leaderboard contains only entries returned by Yandex; no bot rows or fabricated global places.
- [ ] Fullscreen interstitials occur only on explicit menu/result transitions into a new match.
- [ ] Ad close, error, offline, or no-show still continues the intended transition exactly once.
- [ ] `npm run verify:yandex-build` passes and reports the uncompressed archive size.
- [ ] Store/draft text does not state or imply that local opponents are connected real online players.
- [ ] Immediately recheck the current Yandex rule covering "interactive artificial intelligence" before submission. This release uses local rule-based controllers only and contains no generative, LLM, or remote AI feature.
- [ ] Technical leaderboard name is `rating` with descending numeric score.
- [ ] Podkidnoy and Perevodnoy both pass 2-, 3-, and 4-player smoke tests in Draft/debug.
