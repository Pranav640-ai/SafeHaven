# Meridian

Canonical branch: ui. React/Vite travel-safety interface, FastAPI services and a Capacitor Android Nearby bridge. No account is required for guest preparation. Google sign-in and production hosting remain outstanding.

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

## Android

Android Studio/SDK, JDK21 and Google Play services are required. Fresh clone: npm run android:init; then npm run android:sync and npm run android:open. Tracked native/android sources are installed into ignored generated android/. APK: android/app/build/outputs/apk/debug/app-debug.apk. Full JDK/device/hosting/release instructions are in FINAL_HANDOFF.md.

Default nearby help mode auto-accepts participating phones after explicit discovery start, without meeting/code comparison. Participants are unverified. Known-partner mode retains codes. SOS/check-in/location sharing require their separate consent. Pending/carried SOS and queued status use encrypted bounded 24-hour storage; chat history is in memory. No background delivery or rescue guarantee.

## Evidence and remaining work

Earlier baseline: 22 browser/21 backend checks passed; later focused restoration/help checks and web/Android builds passed. Emulator bridge, disconnected SOS queue/cancel and hardware Back passed. Pairing/ACK did not pass: emulator transport status 8011/8012 and some launcher ANRs. Physical connectivity, force-stop queue restoration, compass, native speech and three-phone relay remain unverified. Latest checks are recorded in FINAL_HANDOFF.md.

Risk/weather/incident/map/route/AI content is source-dependent; unknown or empty official coverage is not proof of safety. Translations are unreviewed. Shelters/consular contacts need maintained real data. No offline street-map download, SMS or native FCM is implemented.

Tests (PowerShell): `$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:web`; `.\.venv\Scripts\python.exe -m pytest backend/test_app.py backend/test_safety.py -q`. Use focused subsets for cosmetic changes. [MESH_TEST_GUIDE.md](MESH_TEST_GUIDE.md) covers physical acceptance; [RESCUEMESH_INTEGRATION.md](RESCUEMESH_INTEGRATION.md) describes native wiring. Historical standalone sources/design branches must not replace ui.
