# Ranked PvE Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Ship a release-ready ranked PvE Durak build for Yandex Games with human-like AI, progression/rating, polished card interaction, responsive visuals, and platform-compliant SDK integration.

**Architecture:** Keep the current rules engine authoritative and preserve the public-view boundary for AI. Deliver the approved release design as four independently testable implementation plans executed in dependency order, with full-suite verification after each plan.

**Tech Stack:** React 19.1.1, TypeScript 5.9, Vite 7, Vitest 3, Testing Library, Yandex Games SDK.

**Spec:** docs/superpowers/specs/2026-09-24-ranked-pve-release-design.md

## Global Constraints

- Release v1 is PvE only: one real player, remaining seats AI.
- Supported variants: Podkidnoy and Perevodnoy, 2/3/4 participants, 36-card deck.
- Human turn limit remains 20 seconds; AI hard action ceiling remains 15 seconds.
- No VPS, WebSocket, friends, rooms, or real-player matchmaking in v1.
- AI may consume only its own hand plus public information exposed through MultiplayerPublicView.
- No fake network lag, ping, city, online status, global place, or fabricated match history for AI opponents.
- Global leaderboard entries represent real Yandex users only.
- Match search presentation is variable and bounded, with no Ready step.
- Tap/click remains available alongside pointer drag.
- The final gameplay action must finish visually before the result overlay appears.
- Yandex ID is optional and may only be requested after a deliberate user action with a clear benefit.
- Current Yandex Games documentation must be rechecked before the platform plan is executed.

## Review Focus

- Saved-match migration: an older v2 match must either load safely or fail without deleting profile/progression data.
- Hidden information: no new AI/personality API may accept raw opponent hands or talon order beyond public information.
- Timer interaction: animations, hidden-page pause behavior, bot timing, and result reveal must not restart or duplicate turn deadlines.
- Small-screen input: 320 CSS px layouts must remain playable and pointer drag must not disable normal page scrolling outside a card drag.
- Platform failure: the game must still start and save locally when the Yandex SDK, player object, leaderboard, or authorization flow is unavailable.

---

## Execution Order

1. docs/superpowers/plans/2026-09-24-gameplay-ai.md
2. docs/superpowers/plans/2026-09-24-progression-match-search.md
3. docs/superpowers/plans/2026-09-24-interaction-visual-polish.md
4. docs/superpowers/plans/2026-09-24-yandex-release.md

Do not start a later plan until the earlier plan has its focused tests, full npm test, npm run typecheck, and npm run build green.

## Release Gate

After all four plans:
- [ ] Run npm test and record the exact passing test/file counts.
- [ ] Run npm run typecheck.
- [ ] Run npm run build.
- [ ] Test Podkidnoy and Perevodnoy manually at 2, 3, and 4 participants.
- [ ] Test fresh onboarding, saved-match resume, explicit surrender, timeout, promotion, leaderboard unavailable, and unauthorized guest flows.
- [ ] Test desktop mouse drag and mobile pointer/touch drag.
- [ ] Test 320px, common mobile portrait, mobile landscape, tablet, and desktop layouts.
- [ ] Test Yandex Draft/debug lifecycle, language, storage, auth offer, leaderboard, focus/audio, resize/orientation, and context-menu behavior.
- [ ] Request whole-branch code review before integration.
