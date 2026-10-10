# SafeHaven AI

**One mobile-first tourist safety app:** a React/TypeScript website that can also be packaged as **one Android APK** with Capacitor. A Kotlin bridge supplies Android-only offline peer networking. The project is a hackathon prototype, **not a production emergency service**.

**Repository:** https://github.com/Pranav640-ai/SafeHaven

## Start here — consolidated development branch

Use **[ui](https://github.com/Pranav640-ai/SafeHaven/tree/ui)** for all current development. It includes the reviewed interface, Capacitor Android bridge, and the latest Risk/Explore/Login fixes and engineering handoff.

The former `feature/rescuemesh-android-bridge` and `handoff/risk-ui-onboarding-codex` branches are incorporated into `ui`. The `ui-before-*` and `ui-v8-backup-before-rollback` branches are historical design backups. Leave them as references.

`main` retains the original incomplete standalone Kotlin experiments for audit; their corrected implementation is in `native/android/` on `ui`. Do not merge those obsolete sources into the integrated app. Draft PR #1 is the earlier bridge-to-main proposal; it does not define the canonical development branch.

Latest implementation/Google sign-in handoff: **[FINAL_HANDOFF.md](FINAL_HANDOFF.md)**. Historical developer context: **[CODEX_HANDOFF.md](CODEX_HANDOFF.md)**. Android implementation: **[RESCUEMESH_INTEGRATION.md](RESCUEMESH_INTEGRATION.md)**. Detailed device tests and expected results: **[MESH_TEST_GUIDE.md](MESH_TEST_GUIDE.md)**.

## Product scope — integrated web modules

The `ui` branch now includes a FastAPI backend and working web flows for Open-Meteo destination/forecast lookup, GDACS source reports, optional news search, editable forecast-based replanning, source-linked multilingual guidance, persistent safety packs, a production offline PWA and consent-based private group check-ins.

**Read [IMPLEMENTATION.md](IMPLEMENTATION.md)** for setup, API contracts, provider credentials, deployment configuration, tests and exact limitations. Set private AI/news keys in `backend/.env`; `VITE_API_BASE_URL` is only a public API origin.

Risk data is not a guaranteed safety assessment. GDACS uses approximate event-centre proximity; local official warnings and access restrictions are not comprehensively covered. AI translations are unreviewed and retain English comparison. Android RescueMesh is implemented. Native emulator SOS queue/cancel passed; pairing/delivery verification was blocked by unresponsive Android emulators. Physical-device acceptance remains required; see FINAL_HANDOFF.md for exact evidence.

## Technology

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4 + app CSS, Motion for React, Lucide React, React Loading Skeleton; native horizontal scrolling in the UI.
- **Android:** Capacitor 7; Kotlin Capacitor plugin in `native/android/`; Google Nearby Connections (`com.google.android.gms:play-services-nearby:19.3.0`), plus Capacitor Geolocation when a user chooses to broadcast coordinates.
- **Backend:** Python/FastAPI, Open-Meteo, GDACS, optional Gemini/GNews; SQLite for private groups. Railway Docker deployment and optional separate Vercel frontend configuration are prepared. Account-based authentication, PostgreSQL scaling and map/routing remain future work.
- **Development:** GitHub, Node.js 22+, VS Code, Android Studio with JDK 21, at least two physical Android devices (three for relay).

Do **not** embed Gemini/news API secrets in Vite environment variables exposed to the browser or Android APK.

## Run the frontend

```bash
git clone -b ui https://github.com/Pranav640-ai/SafeHaven.git
cd SafeHaven
npm install
npm run dev
```

Visit the Vite address (normally `http://localhost:5173`). In Chrome, use F12 → Ctrl+Shift+M to emulate a phone. Real mobile browsers can reach the Vite Network URL while on the same Wi-Fi, subject to firewall restrictions.

```bash
npm run build
npm run preview
```

Entry is guest-only; there is no OTP authentication service. Profile → Language opens dedicated language settings for guidance/report explanations; the rest of the interface remains English. Page Back, browser Back and Android system Back use the navigation history. In a browser, RescueMesh must say Android/native hardware is required rather than invent peers or delivered messages.

## Build one Android app

Install Android Studio/SDK, Node.js 22+, JDK 21 and Google Play services on testing phones.

```bash
npm install
npm run android:init
npm run android:open
```

`android:init` runs the frontend build, generates `android/` with Capacitor if absent, syncs assets, installs the Kotlin bridge, registers the plugin and patches the real Android Gradle/manifest. The generated `android/` project is intentionally **not** tracked in Git. Reopen Android Studio to build/install a debug APK.

After React/native source edits:

```bash
npm run android:sync
npm run android:open
```

See `MESH_TEST_GUIDE.md` for installation, permissions, pairing approval, expected results and troubleshooting. Never test real Nearby networking using Chrome device emulation or a web-only deployment.

## Repository map

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Shared mobile shell, Login, Home, Explore, navigation and Profile |
| `src/features/TravelTools.tsx` | Integrated Risk, Replanner, Guidance, Safety Pack and private-group screens |
| `src/services/` | Typed API adapter, persistent local data and PWA registration |
| `backend/app.py` | FastAPI providers, planning/guidance and private-group APIs |
| `IMPLEMENTATION.md` | Current web setup, deployment and limitations |
| `src/styles.css` | Unified v7 design system plus narrowly scoped UI fixes (no second override stylesheet) |
| `src/mesh/RescueMeshScreen.tsx`, `src/mesh/mesh.css` | Tabs/screens for Chats, Nearby, Beacons and SOS |
| `src/mesh/useRescueMesh.ts` | Typed React hook and Capacitor bridge/events, with browser guard |
| `native/android/com/safehaven/rescuemesh/` | Corrected Kotlin manager, plugin and native message protocol |
| `scripts/init-android.mjs`, `scripts/install-rescuemesh.mjs` | Capacitor bootstrap and Android dependency/permission/plugin installer |
| `capacitor.config.ts` | Single Android app config, application ID `com.safehaven.ai` |
| `RESCUEMESH_INTEGRATION.md` | Hardware permissions, protocol and testing instructions |
| `CODEX_HANDOFF.md` | Exact engineering priorities, acceptance criteria and integration plan |
| `.github/workflows/` | Available CI configurations; inspect actual GitHub Actions results before merging |

The original teammate Kotlin experiments are on **`main/android-rescuemesh/`**, not the buildable plugin source on this branch.

## Current verification and limitations

**Consolidation checks (2026-10-10):** `npm run build` passed locally, and both native setup scripts passed Node syntax checks. Android SDK is unavailable locally; the Android workflow now also runs on `ui`. Hardware networking remains unverified.

**Previously reported passing:** integrated frontend Vite/TypeScript CI and an Android debug APK/Gradle build for the RescueMesh integration branch. These demonstrate compilation only. Current web integration passed its local production build, 9 backend tests and 7 browser checks (including offline reload).

**Not yet established:** a reliable two-phone offline session, packet receipt and acknowledgement, three-phone relay, SOS delivery, reboot persistence, permission-denied behavior and end-to-end Android device compatibility. Nearby connections can fail if permission/radios/Play services are absent, and the network cannot guarantee delivery.

**Known safety limitations:** SOS queue is currently in memory, so process death can lose it; beacon claims are not officially verified; an unverified refuge is not an approved shelter; compass distance/bearing does not establish safe routing. Treat external photos as illustrative, not evidence of current destination conditions.

## Next implementation steps

1. Start the API and frontend using [IMPLEMENTATION.md](IMPLEMENTATION.md). Add a server-side Gemini key to enable live AI suggestions and additional translations; optionally configure GNews.
2. Publish using the prepared Docker/Railway or Vercel + Railway configuration. Keep the database on a persistent volume and set actual HTTPS API/CORS origins. Hosting account access is required.
3. Build the Android APK with its public HTTPS API URL, then perform the deferred two/three-phone mesh tests. No radio-delivery claim is established by web tests.

**AI coding assistants:** read [CODEX_HANDOFF.md](CODEX_HANDOFF.md) and [IMPLEMENTATION.md](IMPLEMENTATION.md) before editing. Preserve consent, provenance and honest delivery state.

## Current product handoff

Use [FINAL_HANDOFF.md](FINAL_HANDOFF.md) for website/Android setup, hosting, Google sign-in and testing. [FEATURE_AUDIT.md](FEATURE_AUDIT.md) covers both feature lists honestly; [USER_GUIDE.md](USER_GUIDE.md) explains the journey. Historical handoff files are background, not the current completion record.
