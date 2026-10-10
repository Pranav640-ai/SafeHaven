# Meridian

Travel planning and safety essentials, with offline nearby communication for Android.

- **Live demo:** [safehaven-production-4131.up.railway.app](https://safehaven-production-4131.up.railway.app)
- **Submission source:** [GitHub — ui branch](https://github.com/Pranav640-ai/SafeHaven/tree/ui)
- **Android:** [Download latest Meridian APK](https://github.com/Pranav640-ai/SafeHaven/raw/refs/heads/ui/downloads/Meridian.apk) · [SHA-256 checksum](downloads/Meridian.apk.sha256)
- **Video submission:** To be added. <!-- Replace with the final video submission URL. -->

Use the **ui** branch for the integrated website, FastAPI backend, native plugins and packaged APK. Historical branches are not the submission build.

## Features

| Feature | Implemented experience |
|---|---|
| Explore | Search towns/cities beyond preset cards or select an exact labelled coordinate/timezone. Home retains your destination. |
| Risk insights | Dated weather, outdoor/indoor/water activity evidence, coverage, uncertainty and nearby disaster-report context. |
| Reports | Timestamped source references, historical/local-relevance labels and source-linked explanations. |
| Trip replanner | Dated activities, fixed bookings, preferences, forecast/published-area signals, Original/Proposed comparison, editable suggestions and explicit approve/reject. Approved trips persist locally. |
| Nearby alternatives | Real OSM candidates with distance and information gaps; selecting one fills a draft without overwriting bookings. |
| Incident reporting | Consented category/severity/coordinate observations, nearby filtering, public-evidence checks and owner deletion. Active reports also appear in Map and relevant risk/trip reviews. |
| Map and routes | Source/community markers, published warning polygons, selected points, OSRM route comparisons and available sourced assistance listings. |
| Photo review | Consented AI observations of visible road conditions and uncertainty, when the provider is configured. |
| Guidance and languages | Source-linked Flood/Extreme heat/Earthquake instructions, English comparison, supported-language content, step focus, installed-voice read-aloud and bounded source questions. |
| Safety pack | Offline contacts, itinerary, briefing, guidance, phrases and preparation details. Profile → Contacts supports categories, edit/call/delete and duplicate prevention. |
| Online private groups | Private invites, consented check-ins, refresh, offline queued retry/cancellation and membership removal. |
| Nearby Mesh | Android Bluetooth/Wi-Fi Nearby discovery, automatic help mode, optional known-partner pairing, two-phone Host/Join, chat and peer receipt acknowledgements. |
| SOS and check-ins | Separately consented nearby requests/status. Bounded encrypted pending queues expire within 24 hours; queued/offered/acknowledged states remain distinct. |
| Safety beacons | Temporary unverified GPS meeting points with capacity/expiry/withdrawal. Receivers request approximate bearing/distance; your own beacon has no arrow to itself. |
| Document vault | Profile → Document vault: passphrase-encrypted local passport/visa/insurance images/PDFs and contacts snapshots, offline viewing and auto-lock. |
| Fake call and decoy | Home shortcut: caller name, immediate/delayed simulated call, optional local ringtone, answer/end/cancel and blank screen. No real call is placed. |
| Notifications/response | In-app warnings, optional configured browser web push, signed publisher bulletins and a protected response dashboard with isolated simulation. |
| Authentication | Firebase browser Google popup, native Android Credential Manager login, persistent session/sign-out and guest access. |

## User journey

1. Sign in or continue as guest → **Explore** → select destination/date.
2. **Risk insights** → review Overview, Weather, Reports and Map, including sources and coverage.
3. **Trip replanner** → add activities/bookings → compare proposals/reasons → explicitly approve or reject.
4. **Safety pack** → prepare offline essentials; **Profile → Document vault** → store encrypted private copies.
5. During travel: Guidance, online group status or incident reports; Android Nearby for chat, SOS, check-ins and beacons.

## Install and demonstrate Android

Download the APK on two Android phones with Google Play services. Allow installation from the browser/file app when Android asks. Install over the existing app to retain data; Android Studio is not required for testing the packaged APK.

1. Keep both apps open; enable Bluetooth, Wi-Fi and Location and grant Nearby/location permissions.
2. **Mesh → Nearby**: distinct names, **Nearby help network** on both.
3. A selects **Two phones: host** and starts; B selects **Two phones: join** and starts. Both should show the counterpart connected.
4. Exchange unique messages both ways; confirm received text and **Peer acknowledged**, not just an outgoing bubble.
5. A shares a beacon; B opens Beacons → **Show approximate distance & bearing**. A should not see an arrow to itself. Withdraw and check B.
6. Use clearly labelled test SOS/check-ins without contacting emergency numbers. Repeat chat with mobile data off, keeping Bluetooth/Wi-Fi/Location on.

Mesh, vault, decoy and saved essentials are independent of Railway. Fresh forecasts, public reporting, online groups and Google login need internet. Host/Join and automatic cluster modes use separate services; do not mix them across phones. The APK is a debug-signed evaluation build. The owner reports native Google login working; radio range, multi-hop, background behavior and full native PDF/audio lifecycle acceptance remain device-dependent.

## Data and scope

Forecasts are planning estimates, not disaster probabilities or clearance. No threshold, empty reports or no loaded route intersections does not establish safety. Official instructions take priority. Public incident checks use Open-Meteo/USGS/GDACS/GDELT as context; they do not verify a report. Date-relevant observations within 10 km do not independently change plans or risk scores. Reports expire after 24 hours.

The vault uses Web Crypto AES-256-GCM, PBKDF2-SHA256 (600,000 iterations), random salt/IV and encrypted IndexedDB. Keys/passphrases are not persisted. It locks when hidden, left or idle for two minutes. **No password recovery/cloud sync.** Limits: 20 items, 5 MB each, approximately 30 MB total. Contacts snapshots are separate from the Safety pack's original list; imported originals remain in their original location. Native PDF preview briefly uses private cache and removes temporary files after rendering/startup recovery. Screenshots, compromised devices and system backup policy are outside this at-rest protection; no independent security audit is claimed.

Source/directory coverage and translations require maintenance/review. Nearby identities are unverified; Google login does not authenticate Mesh peers or grant operator roles. Not included: online buddy chat, downloaded offline street maps, native FCM/SMS, Mesh voice calls or automatic rescue dispatch.

## Run locally

Requirements: Node.js 22+, Python 3.12+ and a modern browser.

```powershell
git clone --branch ui https://github.com/Pranav640-ai/SafeHaven.git
cd SafeHaven
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
# First setup only; preserve an existing .env with private keys:
Copy-Item backend/.env.example backend/.env
npm run api
```

In another terminal, run `npm run dev`; open `http://localhost:5173`. Vite proxies `/api` to `http://127.0.0.1:8000`. `npm run build` creates the production site, also served by FastAPI.

## Railway deployment

Keep the existing service/domain; set its GitHub source branch to **ui**, repository root directory to the root and use the supplied **Dockerfile**. It builds the frontend and serves it with FastAPI on Railway's `PORT`. `railway.json` checks `/api/health`. Website/backend share one public domain.

Attach a persistent volume at `/data`; the image uses `DATABASE_PATH=/data/safehaven.db`. Configure private server variables as needed:

- `GEMINI_API_KEY` / `GEMINI_MODEL`: AI suggestions/translations/photo review. Forecast replanning retains a labelled rule-based fallback.
- `GNEWS_API_KEY`: additional news coverage.
- `CORS_ORIGINS`: exact frontend origins, including Android `https://localhost`/`http://localhost` and actual separate/local frontend origins.
- `SAFETY_ADMIN_TOKEN`, `ALERT_SIGNING_KEY`: protected response tools and publisher signing.
- `SAFETY_DIRECTORY_PATH`, `OFFICIAL_SOURCE_HOSTS`: maintained assistance/consular directory and issuer configuration.
- `VAPID_*`, `PUSH_ALLOWED_HOSTS`: optional browser web push.

Other overrides are in `backend/.env.example`. Never commit private environment values, user databases, Firebase service-account keys or publisher private keys.

[Health](https://safehaven-production-4131.up.railway.app/api/health) · [API reference](https://safehaven-production-4131.up.railway.app/docs). On 10 October 2026, the website/health and intelligence/incident-evidence routes were available; Gemini/news configuration flags were false at inspection.

**Routine redeployment keeps the same domain when the service/domain setting is retained.** If you change it, update README/submission URLs, Firebase authorized domains, frontend origins and Android API base, then rebuild the APK. The old `safehaven-production-9f5d.up.railway.app` domain is obsolete.

## Google sign-in

Use Firebase project **safe-havenai**, with Google enabled under Authentication → Sign-in method.

**Laptop/website:** Authentication → Settings → Authorized domains → add **safehaven-production-4131.up.railway.app**, hostname only (no `https://`, path or port). Add `localhost` for local development and the actual address-bar hostname/IP when applicable. Reload and retry. Do not replace Firebase's configured `authDomain` with Railway just to fix this error. [Official Google sign-in setup](https://firebase.google.com/docs/auth/web/google-signin).

**Android:** package **com.safehaven.ai**, registered signing certificate and ignored `native/google-services.json`. Bundled APK SHA-1: **BB:56:F3:6B:F2:4A:1D:1F:A5:67:F3:D4:8B:28:72:4B:BA:BC:6C:76**. Sync reads its public Web OAuth client; `GOOGLE_WEB_CLIENT_ID` is an optional build variable. Another machine/release key needs its own fingerprint registration. CI can read the public Web OAuth client from the GitHub repository variable `GOOGLE_WEB_CLIENT_ID`; each CI signing key must also be registered for real account acceptance. Native login uses Credential Manager → Google token → Firebase session; browser login uses popup. Server token/role enforcement is separate.

## Build Android / refresh APK

Install Android Studio/SDK and JDK 21. Tracked sources/resources are in `native/`; root `android/` is generated/ignored. Keep existing package and saved-data keys for compatibility.

Create ignored `.env.production` (a public example is provided):

```dotenv
VITE_API_BASE_URL=https://safehaven-production-4131.up.railway.app
```

```powershell
npm run android:init  # Fresh native project only
npm run android:sync # Successful web build, asset sync and tracked plugins
$env:JAVA_HOME='C:\Path\To\JDK21'
.\android\gradlew.bat -p android :app:assembleDebug --no-daemon '-Pandroid.injected.testOnly=false'
```

macOS/Linux: `./android/gradlew -p android :app:assembleDebug --no-daemon`. Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Copy the verified build to `downloads/Meridian.apk` and regenerate `downloads/Meridian.apk.sha256` together. APK needs a reachable HTTPS API base; the hosted site uses relative same-origin `/api`. Play Store release requires release signing/certificate registration.

## Architecture and validation

`src/features/`: planning, reports, conditions, guidance, pack, vault/decoy/response. `src/services/`: API/storage/auth/crypto. `src/mesh/` and `native/android/`: Nearby UI/native radio, Google auth, speech and PDF preview. `backend/`: FastAPI/safety/groups/push/intelligence. `scripts/`, `tests/`, `.github/workflows/`: setup/build and focused validation.

Recent feature checks passed: five incident/backend and four vault/decoy/report/beacon browser checks, web/Android builds and APK asset verification. Browser native-bridge fixtures do not prove physical radio delivery or native PDF/audio behavior. Submission cleanup uses type/build/artifact checks without repeating the entire suite.

When needed: `.venv/Scripts/python.exe -m pytest backend/test_incident_integration.py -q`; Playwright `tests/personal-safety.spec.ts` against a local preview/API with `TEST_BASE_URL` configured. The Lucide shield-check icon's source and ISC attribution remain in `native/icon-source/`.
