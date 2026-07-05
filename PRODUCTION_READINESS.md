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
- API containerization is **in place**: `docker/api/Dockerfile` (multi-stage),
  `docker/docker-compose.yml` (Mongo + API for local prod-parity), and a Render
  blueprint (`render.yaml`). CORS now allows multiple web origins + Capacitor
  origins, and the API binds `0.0.0.0` in production. Still needs a live host + Atlas.

---

## Phase 1 — Deploy the backend (hard blocker)

Nothing can be tested on a real device until the app can reach a live backend
over HTTPS. `localhost` is the device itself once installed.

- [ ] **Provision MongoDB Atlas** (free M0 tier is fine to start). Get the SRV
      connection string.
- [~] **Deploy the API** (`apps/go-game-api`) to a host (Render / Railway / Fly.io).
  - [x] Add a `Dockerfile` building `nx build go-game-api` and running
        `dist/apps/go-game-api/main.js` → `docker/api/Dockerfile` (multi-stage,
        non-root, container healthcheck on `/health`). Build verified: the
        artifact boots and serves `/health`.
  - [ ] Push to the host (a `render.yaml` blueprint is ready) and set production
        env vars (see `apps/go-game-api/.env.example`):
        `NODE_ENV=production`, `MONGODB_URI`, strong `JWT_SECRET`,
        `JWT_REFRESH_SECRET`, `PARTYKIT_WEBHOOK_SECRET`, `CORS_ORIGIN`.
  - [x] Confirm `env.ts` prod validation passes (it throws if secrets missing).
        `CORS_ORIGIN` is now also required in production.
- [ ] **Deploy PartyKit** (`apps/go-game-partykit`) via `npx partykit deploy`.
  - [ ] Confirm the prod host matches `partykit-client.ts` (`go-game-server.partykit.dev`)
        or update the client to the real deployed host.
  - [ ] Set the PartyKit env `PARTYKIT_WEBHOOK_SECRET` to match the API.
- [x] **Fix CORS for mobile origins.** `main.ts` now accepts a comma-separated
      `CORS_ORIGIN` list of web origins and automatically allows the Capacitor
      origins (`capacitor://localhost`, `http(s)://localhost`, `ionic://localhost`).
      Disallowed origins receive no CORS headers (browser-blocked) without a 500.
      Verified for allowed web, Capacitor, and rejected origins.
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

- [~] **In-app account deletion (Apple REQUIRED).**
  - [x] Added `DELETE /auth/account` (authenticated) — deletes the user, their
        games, and spectator references. Deleting the user immediately invalidates
        all their tokens (auth + refresh look the user up by id). Client method
        `apiClient.deleteAccount()` added; covered by unit tests.
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
- [x] **Fix drifted tests.** The `test:game` suite is now green (357/357 passing);
      the previously reported 31 failures are resolved.
- [x] **Cleanup:** removed duplicate Mongoose schema indexes on the `Game` model
      (`roomId` had both `unique` and `index: true`; `roomCode` had `unique` plus a
      redundant `schema.index()`). The `User` indexes were already single-definition.
- [x] **API security hardening:** added `helmet` (HSTS, nosniff, frameguard, no
      `x-powered-by`), a stricter rate limit on `/api/auth/login` + `/register`,
      real logout (refresh-token revocation via a TTL denylist) and refresh-token
      rotation. CORS allows configured web + Capacitor origins. `trust proxy` set
      for accurate client IPs behind a PaaS proxy.
- [x] **Input validation & NoSQL-injection defense:** `express-mongo-sanitize`
      strips `$`/`.` operators from request payloads; express-validator chains
      validate register/login/profile (email format, username pattern, bio/country
      length, avatar must be an http(s) URL — blocks `javascript:` URIs).
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

# Build & run the API container (context must be the repo root)
docker build -f docker/api/Dockerfile -t go-game-api .
docker run --rm -p 8080:8080 \
  -e MONGODB_URI=... -e JWT_SECRET=... -e JWT_REFRESH_SECRET=... \
  -e PARTYKIT_WEBHOOK_SECRET=... -e CORS_ORIGIN=https://your-frontend \
  go-game-api

# Local full stack (Mongo + API) with prod parity
docker compose -f docker/docker-compose.yml up --build
```

## Key files

| Concern | File |
|---|---|
| API env/secrets/CORS | `apps/go-game-api/src/config/env.ts`, `.env.example` |
| API CORS usage | `apps/go-game-api/src/main.ts` |
| API container | `docker/api/Dockerfile`, `.dockerignore` |
| Local full stack | `docker/docker-compose.yml`, `docker/mongodb/init-mongo.js` |
| API host deploy | `render.yaml` (Render blueprint) |
| Auth routes (add delete here) | `apps/go-game-api/src/routes/authRoutes.ts` |
| Frontend API base URL | `libs/game/src/lib/services/api-client.ts` (`NX_API_URL`) |
| Token storage | `libs/game/src/lib/services/api-client.ts` (`localStorage`) |
| PartyKit prod host | `libs/game/src/lib/services/partykit-client.ts` |
| Capacitor config | `capacitor.config.ts` |
| Web deploy (Pages) | `.github/workflows/deploy.yml` |
