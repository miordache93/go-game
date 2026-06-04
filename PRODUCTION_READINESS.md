# Production Readiness & App Store Release Plan

Roadmap to take Go Game from "runs locally" to "published on the Apple App Store
and Google Play Store."

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done

**Current state (baseline):**
- Web app, API, and PartyKit all run locally and work end-to-end.
- Capacitor shell builds for iOS and Android (`android/`, `ios/`).
- Frontend auto-deploys to GitHub Pages (`.github/workflows/deploy.yml`).
- API + PartyKit are **not** deployed; DB is local MongoDB.
- Secrets centralized in `apps/go-game-api/src/config/env.ts` (fails fast in prod).

---

## Phase 1 — Deploy the backend (hard blocker)

Nothing can be tested on a real device until the app can reach a live backend
over HTTPS. `localhost` is the device itself once installed.

- [ ] **Provision MongoDB Atlas** (free M0 tier is fine to start). Get the SRV
      connection string.
- [ ] **Deploy the API** (`apps/go-game-api`) to a host (Render / Railway / Fly.io).
  - [ ] Add a `Dockerfile` (or use the host's Node buildpack) building
        `nx build go-game-api` and running `dist/apps/go-game-api/main.js`.
  - [ ] Set production env vars (see `apps/go-game-api/.env.example`):
        `NODE_ENV=production`, `MONGODB_URI`, strong `JWT_SECRET`,
        `JWT_REFRESH_SECRET`, `PARTYKIT_WEBHOOK_SECRET`, `CORS_ORIGIN`.
  - [ ] Confirm `env.ts` prod validation passes (it throws if secrets missing).
- [ ] **Deploy PartyKit** (`apps/go-game-partykit`) via `npx partykit deploy`.
  - [ ] Confirm the prod host matches `partykit-client.ts` (`go-game-server.partykit.dev`)
        or update the client to the real deployed host.
  - [ ] Set the PartyKit env `PARTYKIT_WEBHOOK_SECRET` to match the API.
- [ ] **Fix CORS for mobile origins.** `config.corsOrigin` currently defaults to
      `http://localhost:4200`. Capacitor calls from `capacitor://localhost` (iOS)
      and `https://localhost` (Android). Allow these + the web origin.
- [ ] **Verify** the deployed API health and a real query (e.g. leaderboard) over HTTPS.

**Acceptance:** API reachable at a public HTTPS URL, PartyKit live over `wss://`,
CORS allows Capacitor origins, end-to-end login + game save works from the web app
pointed at production.

---

## Phase 2 — Wire the mobile app to production

- [ ] **Build-time API URL.** Build the device bundle with `NX_API_URL` set to the
      deployed API (`api-client.ts` reads `process.env.NX_API_URL`). Example:
      `NX_API_URL=https://api.example.com/api npm run mobile:sync`.
- [ ] **PartyKit host in production build.** `partykit-client.ts` switches on
      `NODE_ENV==='production'` — confirm the prod build uses the deployed host.
- [ ] **Android cleartext:** keep HTTPS-only (`allowMixedContent: false` in
      `capacitor.config.ts`). Only enable cleartext for temporary LAN dev testing.
- [ ] **Smoke test on a real device / emulator:** login, create room, play a move,
      finish a game, check leaderboard and persistence.

**Acceptance:** A device build (not live-reload) performs full auth + multiplayer
against production backends.

---

## Phase 3 — Store submission gates (policy — rejections if skipped)

- [ ] **In-app account deletion (Apple REQUIRED).** No delete endpoint exists today
      (`authRoutes.ts` has register/login/refresh/logout/profile/stats only).
  - [ ] Add `DELETE /auth/account` (authenticated) that removes the user + their data.
  - [ ] Add a "Delete account" action in the profile UI with confirmation.
- [ ] **Privacy policy** published at a public URL (collects username/email/password).
- [ ] **Terms of service** (recommended).
- [ ] **Apple App Privacy labels** + **Google Data Safety form** filled out
      (declare account data collection).
- [ ] **Real bundle identifier.** Replace placeholder `com.gogame.app` in
      `capacitor.config.ts` with an owned reverse-domain ID; set app version/build.

**Acceptance:** Account deletion works end-to-end; legal pages live; privacy
declarations drafted.

---

## Phase 4 — App identity & signing

- [ ] **Icons & splash.** Replace default Capacitor assets. Use `@capacitor/assets`:
      provide a 1024×1024 icon + splash source, run the generator, `npx cap sync`.
- [ ] **iOS signing.** Apple Developer Program ($99/yr), register bundle ID,
      create provisioning profiles, configure signing in Xcode.
- [ ] **Android signing.** Generate a release keystore, configure
      `android/app/build.gradle` signing config, store keystore secrets securely.
- [ ] **First test builds:** TestFlight (iOS) and Play Console internal testing (Android).

**Acceptance:** Signed builds install via TestFlight and Play internal testing.

---

## Phase 5 — Hardening & quality (strongly recommended pre-launch)

- [ ] **Secure token storage.** Move JWTs from `localStorage` (`api-client.ts`) to
      `@capacitor/preferences` / secure storage on native.
- [ ] **Auth completeness:** password reset, optional email verification,
      profile-update endpoint.
- [ ] **Network resilience:** PartyKit auto-reconnect/backoff for flaky mobile networks;
      offline/empty/error states in the UI.
- [ ] **Crash reporting + analytics** (e.g. Sentry).
- [ ] **Fix drifted tests** (31 failing in `test:game` — stale selectors/CSS class names,
      plus scoring assertions). Get the suite green.
- [ ] **Cleanup:** remove duplicate Mongoose schema indexes (warnings on `username`,
      `email`, `partykitId`, `roomCode`).
- [ ] **Performance:** verify Konva board rendering on low-end devices.

**Acceptance:** Green test suite, clean API logs, crash reporting live, secure storage.

---

## Phase 6 — Submit

- [ ] App Store Connect listing: screenshots (all required device sizes), description,
      keywords, age rating, support URL.
- [ ] Google Play Console listing: feature graphic, screenshots, description, content rating.
- [ ] Final release builds (signed, production backend), upload, submit for review.
- [ ] Respond to review feedback.

**Acceptance:** Approved and live on both stores.

---

## Reference: useful commands

```bash
# Run all services locally
npx nx serve go-game-api          # API  :8080
cd apps/go-game-partykit && npx partykit dev   # PartyKit :1999
npx nx serve go-game              # Web  :4200

# Mobile
npm run mobile:sync               # build web + cap sync (run after web changes)
npm run mobile:ios                # build + sync + open Xcode
npm run mobile:android            # build + sync + open Android Studio

# Build pointed at production backend
NX_API_URL=https://api.example.com/api npm run mobile:sync

# Deploy PartyKit
cd apps/go-game-partykit && npx partykit deploy
```

## Key files

| Concern | File |
|---|---|
| API env/secrets/CORS | `apps/go-game-api/src/config/env.ts`, `.env.example` |
| API CORS usage | `apps/go-game-api/src/main.ts` |
| Auth routes (add delete here) | `apps/go-game-api/src/routes/authRoutes.ts` |
| Frontend API base URL | `libs/game/src/lib/services/api-client.ts` (`NX_API_URL`) |
| Token storage | `libs/game/src/lib/services/api-client.ts` (`localStorage`) |
| PartyKit prod host | `libs/game/src/lib/services/partykit-client.ts` |
| Capacitor config | `capacitor.config.ts` |
| Web deploy (Pages) | `.github/workflows/deploy.yml` |
