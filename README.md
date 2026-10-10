# Meridian AI

Canonical branch: `ui`. React/Vite travel-safety interface, FastAPI services and a Capacitor Android Nearby bridge. Guest preparation requires no account. **Firebase Google web sign-in is wired into the login page**; production hosting and native Android OAuth validation remain outstanding.

## Start / takeover

Read [AGENTS.md](AGENTS.md), [NEXT_AGENT_CONTEXT.md](NEXT_AGENT_CONTEXT.md) and [FINAL_HANDOFF.md](FINAL_HANDOFF.md). [UI_CHECKLIST.md](UI_CHECKLIST.md) records visible-core/redundancy decisions; [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md) checks every proposed item; [FEATURE_AUDIT.md](FEATURE_AUDIT.md) gives implementation/dependency details. [USER_GUIDE.md](USER_GUIDE.md) explains the journey.

The six Home and three trip-card SVG illustrations are fixed. Keep fonts, widget frames and animation unchanged. Profile edit uses Pencil; the gear opens Settings. Preparation and reminders are in Safety pack rather than duplicated Home widgets.

## Run locally (PowerShell)

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
# First setup only: copy backend/.env.example to backend/.env; preserve existing local keys.
npm run api
# In a second terminal:
npm run dev
```

Vite normally serves http://localhost:5173; API http://127.0.0.1:8000. A built site (npm run build) is also served by the API. Keys stay in ignored backend/.env; never place private keys in frontend/APK.

## Firebase Google authentication

The shared web login in `src/GoogleLoginPage.tsx` uses Firebase Authentication (`signInWithPopup`) and the existing Firebase project configuration in `src/firebase.ts`. `src/App.tsx` tracks login persistence with `onAuthStateChanged` and implements `signOut`. The Google button is real; **Continue as guest** deliberately skips authentication. The `GoogleLoginPage` Git branch is an old Kotlin-only branch pointing to `main`, not the current React login implementation.

To make sign-in work when deployed: in **Firebase Console → Authentication → Sign-in method**, enable Google, and in **Authentication → Settings → Authorized domains**, add each web hostname that hosts the frontend (localhost as applicable and your actual Vercel/custom domain). Maintain the existing Firebase project values unless migrating projects. Firebase web config identifiers are public client config, **not** service-account credentials. Never commit a Firebase Admin private key or service-account JSON.

The current popup flow is intended for a normal web browser. **Android Capacitor WebView sign-in must be verified separately**; a native-compatible OAuth flow may be required. The UI layout is tested in `tests/auth-layout.spec.ts`, covering the desktop phone frame, full-bleed mobile viewport, buttons, guest entry and dock alignment.

## Android

Android Studio/SDK, JDK21 and Google Play services are required. Fresh clone: npm run android:init; then npm run android:sync and npm run android:open. Tracked native/android sources are installed into ignored generated android/. APK: android/app/build/outputs/apk/debug/app-debug.apk. Full JDK/device/hosting/release instructions are in FINAL_HANDOFF.md.

Default nearby help mode auto-accepts participating phones after explicit discovery start, without meeting/code comparison. Participants are unverified. Known-partner mode retains codes. SOS/check-in/location sharing require their separate consent. Pending/carried SOS and queued status use encrypted bounded 24-hour storage; chat history is in memory. No background delivery or rescue guarantee.

## Evidence and remaining work

Earlier baseline: 22 browser/21 backend checks passed; later focused restoration/help checks and web/Android builds passed. Emulator bridge, disconnected SOS queue/cancel and hardware Back passed. Pairing/ACK did not pass: emulator transport status 8011/8012 and some launcher ANRs. Physical connectivity, force-stop queue restoration, compass, native speech and three-phone relay remain unverified. Latest checks are recorded in FINAL_HANDOFF.md.

Risk/weather/incident/map/route/AI content is source-dependent; unknown or empty official coverage is not proof of safety. Translations are unreviewed. Shelters/consular contacts need maintained real data. No offline street-map download, SMS or native FCM is implemented.

Tests (PowerShell): `$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:web`; `.\.venv\Scripts\python.exe -m pytest backend/test_app.py backend/test_safety.py -q`. Use focused subsets for cosmetic changes. [MESH_TEST_GUIDE.md](MESH_TEST_GUIDE.md) covers physical acceptance; [RESCUEMESH_INTEGRATION.md](RESCUEMESH_INTEGRATION.md) describes native wiring. Historical standalone sources/design branches must not replace ui.

The combined UI retains Meridian’s earlier widgets/navigation/animations with the newer Firebase login. Android account-chooser setup and exact signing fingerprints: [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md). Offline Mesh remains accessible as guest.

Risk and nearby-place functionality from the backend branch is now integrated; see [FUNCTIONALITY_INTEGRATION.md](FUNCTIONALITY_INTEGRATION.md) for API routes, user flow and provider requirements.

Current backend: [https://safehaven-production-9f5d.up.railway.app](https://safehaven-production-9f5d.up.railway.app). Deployment must use canonical `ui` to include the intelligence routes; health alone does not prove all features are deployed. Online buddy chat is deferred until physical Mesh acceptance; see [BUDDY_SYSTEM_PLAN.md](BUDDY_SYSTEM_PLAN.md).
