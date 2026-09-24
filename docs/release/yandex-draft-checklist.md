# Yandex Games draft checklist

Use this checklist for the production archive and Yandex Draft/debug pass.

## Automated verification snapshot — 2026-09-24

- Release branch: `feature/release-ranked-pve`
- Verified head: `3b46b51036492e324d30fde1b6a93f1c71d258f1`
- CI: 83 test files passed, 446 tests passed, TypeScript typecheck passed, production build passed.
- Release artwork verification passed.
- Yandex archive verification passed: 63 files, 1,219,908 uncompressed bytes.
- Yandex SDK is loaded from the documented platform root path `/sdk.js`.
- GitHub Actions workflows use Node-24-based action runtimes while the project build remains on Node 22.
- Current Yandex Games requirements were rechecked on 2026-09-24. Requirement 1.23 still states that interactive AI is prohibited. This release contains local rule-based computer opponents only; no generative model, LLM, remote AI service, adaptive model training, or free-form AI interaction. Treat moderation interpretation of this wording as a release gate and recheck immediately before submission.

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
