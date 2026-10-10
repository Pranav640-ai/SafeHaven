# SafeHaven complete handoff — 10 October 2026

Canonical branch: `ui`. Read FEATURE_AUDIT.md for every item from both supplied feature lists, USER_GUIDE.md for the user journey, and MESH_TEST_GUIDE.md for radio acceptance. This replaces earlier handoff assumptions about in-memory pending Mesh queues. Do not merge old design backups or the unrelated historical Kotlin app into this branch.

## User journey and feature ownership

Enter as guest → Home. The Home landscape card has one action, **Check a destination**; it opens a chooser, never an automatic Manali detail. Explore destination tiles intentionally open their named destination. Home feature cards describe their purpose. Icons and widget designs are preserved.

Planning: destination check → search/select town → choose date → weather/reports/Map → save briefing → plan dated activities → review proposal, compare and edit before accepting → save Safety pack. Back returns through actual navigation history and restores selected destination/scroll. Opening the replanner without a saved destination asks you to choose one before adding an activity.

Already travelling: Risk → Map → explicitly use location or select a point → view sourced reports/areas, routes or directory shelters. Publishing a community observation requires public-sharing consent and is labelled unverified. Delete your observation using its local ownership capability. A proposed route only avoids loaded hazard polygons; do not label it safe.

Preparing: Safety pack → contacts, hotel/meeting point, itinerary, saved briefing, prepared guidance, phrases, consular lookup. Prepare while online, then reopen offline. Saved reports have timestamps/expiry. Private group create/join → explicit status-sharing consent → check-in → retry queued status or leave. This is separate from Nearby sharing.

Emergency: SOS opens its own screen; select guidance/contacts or consent to a short Nearby SOS. Without connections, an Android SOS can queue on this phone for up to 24 hours. Mesh → Nearby → start discovery → choose Nearby help network and start discovery → automatic participation → chat/check-in/beacon. Known-partner mode retains code comparison. Delivery ACK is a peer receipt, not rescue dispatch. Browser Mesh shows controls and explains disabled native actions.

Language: Profile → Language settings or Guidance language selector. English/Hindi/Tamil plus configured AI French/Spanish and offline phrase bank are present. Prepared/generated translations require qualified review. Guidance listening requires browser support or an installed native offline voice.

Private operator: `/response` → token access → observations/review/publisher bulletins/metrics and isolated scenarios. Do not put response controls in the public tourist navigation. Simulator never sends live alerts.

| UI | Implementation | Dependency |
|---|---|---|
| Home/Explore/SOS/Profile/history | src/App.tsx | Guest/local state; native Back |
| Risk/Plan/Guide/Pack/groups | src/features/TravelTools.tsx | src/services/api.ts, backend/app.py |
| Map/report/route/photo | src/features/LocalConditions.tsx | backend/safety.py, Leaflet, OSRM, Gemini |
| Area warnings | AreaWarnings.tsx | Publisher feed + pinned Ed25519 key |
| Phrases/voice/source questions | EmergencySupport.tsx | General sources; SafetySpeechPlugin.kt |
| Browser notifications | DestinationNotifications.tsx, public/push-worker.js | backend/push.py, VAPID, delivery worker |
| Response/scenario | ResponseDashboard.tsx | /api/safety/response, operator token |
| Mesh/beacons | src/mesh/* | native/android/.../RescueMeshManager.kt + MeshQueueStore.kt |

## Run the website locally (Windows PowerShell)

From `C:\Users\asus\SafeHaven`, install Node.js LTS and Python, then:

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
# First setup only; preserve existing local values.
Copy-Item backend/.env.example backend/.env
npm run api
```

Use a second terminal: `npm run dev`; open the Vite URL, normally http://localhost:5173. API runs http://127.0.0.1:8000. Put Gemini/GNews keys only in backend/.env, never chat or frontend env. Existing local config must not be overwritten. For built single-origin preview run `npm run build` and open http://127.0.0.1:8000 (API serves dist). Backend health: `/api/health`.

Optional local publisher/push setup: `.\.venv\Scripts\python.exe scripts/setup-safety.py`. It generates local secrets/public pins without printing keys; review backend/.env.example. Provide maintained `SAFETY_DIRECTORY_PATH` JSON and exact `OFFICIAL_SOURCE_HOSTS`; neither establishes authority trust automatically. Response token is a prototype operator credential, not production identity.

Checks: `$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:web` uses installed Chrome. Backend: `.\.venv\Scripts\python.exe -m pytest backend/test_app.py backend/test_safety.py -q`. Scenario: `npm run test:scenario`. Do not repeatedly run the whole suite for copy-only work.

## Host the website and API

Recommended first deployment: one HTTPS service serving FastAPI and dist, avoiding split-origin complexity. Build with `npm ci` then `npm run build`; install pinned backend requirements; start `python -m uvicorn backend.app:app --host 0.0.0.0 --port <host-port>`. Configure service secrets/environment, persistent writable storage for DATABASE_PATH, backups and HTTPS. Verify `/api/health`, destination/weather/guidance, private group ownership, CORS and cache updates before sharing a URL. No deployment has been performed.

For separate static frontend/CDN and Python API: set public `VITE_API_BASE_URL=https://your-api.example` before build and exact `CORS_ORIGINS` for website plus native localhost origins. Vite env is build-time; rebuilding is required. Set public `VITE_ALERT_PUBLIC_KEY` to the publisher pin; keep signing key, Gemini, VAPID private key and operator token only on server. Keep Gemini failure/absent-key messages truthful.

Run `scripts/deliver-alerts.py` as a supervised recurring worker when enabling web push. Run `.\.venv\Scripts\python.exe scripts/deliver-alerts.py` and verify provider setup, opt-in/revoke and an actual device notification receipt. Jobs expire/retry; provider acceptance and service-worker receipt are distinct. Host push private PEM outside ephemeral storage. Native FCM/SMS remain future work. Add production roles, rate limits, monitoring, retention and issuer/key-rotation operations before public emergency use.

## Android Studio: installation and running

The app already has a Capacitor Android shell; no full React-to-Kotlin rewrite is needed. [Install Android Studio](https://developer.android.com/studio/install), run Setup Wizard and install Android SDK, Platform Tools and Emulator. Device Manager → create a Google Play enabled Pixel image. Two emulators are enough for preliminary pairing; close unnecessary extra emulators if memory is tight. Actual Bluetooth/Wi-Fi acceptance needs physical phones.

Install/select **JDK 21**. This machine uses `C:\Users\asus\.jdks\jbr-21.0.11`; Studio's bundled Java 25 is incompatible with this Gradle version. Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK: select 21. Local SDK: `C:\Users\asus\AppData\Local\Android\Sdk`.

```powershell
npm run android:sync
npm run android:open
$env:JAVA_HOME='C:\Users\asus\.jdks\jbr-21.0.11'
.\android\gradlew.bat -p android :app:assembleDebug --no-daemon
```

Android Studio opens generated `android/`. Wait for Gradle sync, select device and Run; repeat for the second device. APK normally: `android/app/build/outputs/apk/debug/app-debug.apk`; the final build emitted the normal outputs APK. An earlier IDE test-only build used `android/app/build/intermediates/apk/debug/app-debug.apk`. The Mesh harness accepts either path, or explicit MESH_APK_PATH. For real phones enable Developer options → USB debugging, approve computer trust, and check `adb devices -l`; [official device setup](https://developer.android.com/studio/run/device). Google Play services are required for Nearby. Package ID: `com.safehaven.ai`.

Root android/ is generated and ignored. Tracked Kotlin under native/android and scripts/install-rescuemesh.mjs are authoritative; sync copies/installs them. Do not lose fixes by editing only generated Android files. For a fresh clone run `npm run android:init` before sync if android/ does not exist.

A packaged APK must use a real HTTPS API origin for online features: set VITE_API_BASE_URL locally in .env.production and run `npm run android:release:prepare`. It refuses an absent/unreachable API. Current debug package is suitable for packaged UI/offline Mesh testing; it is not a hosted backend. `npm run android:emulator` is live preview and must not be used to claim offline acceptance.

For release, set a version code/name, application privacy policy, review permissions, use Android Studio Build → Generate Signed Bundle/APK → AAB, keep/upload signing keys securely and use a Play internal testing track before rollout. Follow [Capacitor deployment](https://capacitorjs.com/docs/android/deploying-to-google-play). Do not ship debug signing, prototype admin tokens or secrets in the APK.

## Google sign-in handoff (delegated)

Owner must supply Google Cloud/Firebase project; credentials were not provided and Google sign-in is not implemented. Keep guest entry. Enable Google provider, authorize web domains, register package com.safehaven.ai and debug/release SHA fingerprints. Implement web Firebase auth and native Credential Manager sign-in via a reproducible native bridge/config; avoid OAuth inside an embedded WebView. Track native configuration outside ignored android/, excluding secrets.

Verify backend ID tokens (signature, issuer, audience, expiry), map stable user IDs and enforce server-side roles. Replace response token with authorized operator roles. Add sign-out, cancel/error/offline handling and explicit opt-in before migrating local preparation to an account. Online private group and Nearby device identities must not silently become the same sharing audience. Test guest, web redirect/popup, native first/returning login and release fingerprints. Sources: [Firebase Android Google sign-in](https://firebase.google.com/docs/auth/android/google-signin), [Firebase web sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg).

## Mesh acceptance and refinement

Use MESH_TEST_GUIDE.md. Automatic preliminary command after building: `npm run test:mesh -- emulator-5558 emulator-5560`. It only selects explicit running emulators, installs APK, grants test permissions, selects known-partner mode, compares codes and tests real native ACKs. No stubs. First-use permission prompts still need a separate manual test. Keep Wi-Fi and Bluetooth radios on while internet is disconnected.

Required physical tests: pair/reject codes, two-way chat ACK, SOS ACK, queued SOS cancellation, force-stop/reopen then reconnect within 24h, expiry, explicit Stop clearing pending local items, safe/need-help consent, GPS permission denial, beacon capacity/expiry/withdraw, compass/sensor fallback, native offline voice, Android Back and app upgrades. Three phones: A↔B then B↔C with A out of range; verify one delivery and bounded TTL/dedup/expiry. Cancellation cannot retract a copy already relayed by a peer. Queues are encrypted with Android Keystore; no background service or delivery after termination is promised. Uninstall/clear app data removes local state.

Record device/Android/Play services versions, permissions, exact failure stage, matching digits, message IDs/ACK timestamps and logcat; never treat a sent-to-radio offer as delivered. Physical range/battery/foreground/background tests and foreground-service design remain before reliability claims.

## Architecture and next improvements

Functionality is still spread across App.tsx route callbacks, TravelTools, localStorage keys and separate native hooks. UX now has purpose descriptions and forward actions, but this is not yet a clean product architecture. Next implement a shared Trip (selected location/date/stops/preferences), central route/deep-link registry and capability matrix, split tool modules, keep all destination/date changes in the shared Trip, and define ownership for each feature/service. Test with new travellers: can they distinguish destination check, replanning, general guide, private group and nearby Mesh without explanation? Preserve widgets/icons while refining copy and empty states.

Do next in order: deploy API and Google authentication; validate physical Mesh; maintain real official/directory data and review translations; verify real AI/photo/push services; licensed offline maps and production operations. See feature audit for partial vs absent requirements. Avoid fake official alerts, predicted safe routes or simulated participants in public screens.

## Verification record

Baseline completed before final copy/layout: 22 browser checks and 21 backend checks passed, including consent/report deletion, itinerary/back flow, multilingual preparation, ownership/role boundaries, geometry/signatures/push contracts and isolated simulation. Final production TypeScript/web build and Android packaging are recorded below. Latest focused browser and live Mesh results are appended after execution; no physical radio acceptance is claimed.

Final focused web verification: five Home/routes/search checks passed; itinerary edits/offline pack and destination/Back checks passed after the final build. TypeScript/production build and final Gradle debug build passed. ZIP inspection confirms final APK assets match dist/index.html. Installed Chrome is required here via PLAYWRIGHT_CHANNEL=chrome. A transient offline test during asset rebuilding was rerun successfully after build completion.

The new destination-required/scenario UI check passed using fixtures; the real authenticated isolated scenario endpoint also returned 200, affected route true, actual notifications sent 0. A live Munnar weather request returned 200 and 16 forecast days from Open-Meteo. No full-suite rerun was needed for the final copy/layout changes.

## Current native test evidence

ADB showed four emulators. 5554/5556 were blocked by Android launcher ANRs, unrelated to SafeHaven. The final APK installed on responsive 5558/5560 (API 35); real native bridge initialization, disconnected SOS queue/cancel and Android hardware Back from SOS to the previous Mesh screen passed. An initial discovery attempt received mismatched requests/STATUS_ENDPOINT_UNKNOWN with unrelated peers visible. The harness now selects named counterpart requests, never blindly the first request. Final pairing result is recorded below. These results do not validate encrypted queue restoration after force-stop, compass, native speech, physical range or multi-hop.

Final selected-pair attempt: timed out after 60 seconds with `8012: STATUS_ENDPOINT_IO_ERROR` on 5558/5560. Pairing, bidirectional chat ACK and connected SOS ACK did NOT pass. Preserve `test-results/mesh-emulators/results.json` and failure screenshots locally when diagnosing. Next test on two real Play-services phones, isolate other discoverers and capture Nearby/Play services logs. Investigate symmetric request initiation only if the isolated physical test reproduces it; emulator I/O errors alone do not prove that cause. Do not claim Mesh connectivity complete.

## Follow-up UI restoration

Home shows the saved destination and opens its check, with notification and menu controls restored. Card/carousel artwork was recovered from prior repository code; existing fonts remain unchanged. The dock compact animation is restored with five separate targets, and every page uses the same outline shimmer/timing. Mesh/SOS/beacon header activation badges and repetitive install copy were removed in favour of concrete next actions. Native location requests now include coarse + fine location, including the modern Nearby permission path; the merged manifest has both permissions without a max-SDK limit.

Trip approval updates the saved Original, keeps Proposed selectable with no pending changes and preserves approval reasons. Six focused browser checks passed (Home controls/selected destination, approval/reload, four mobile dock sizes). Web and Android builds passed; final APK asset equality was checked and the package installed on 5558/5560. First-use permission denial/approximate-location acceptance and physical Mesh transport still require device acceptance; previous pairing limitations remain.

## Latest Mesh participation model

The default Nearby help network connects participating phones automatically when discovery is explicitly started. Travellers do not need to find each other first or exchange codes. The native start call carries allowUnverified=true; connection initiation calls acceptConnection only while the network is running. Known-partner mode passes false and retains code comparison. Participation is foreground/best effort and radio-range limited; it is not a long-range locator or rescue dispatch. SOS, check-in and precise location still have their existing separate sharing consent.

Anonymous connections and self-reported names are unverified. They must not be presented as trusted rescuers or authenticated private group members. Google cautions that skipping token authentication leaves connections unauthenticated; future application-level signatures/pre-established trust are needed for trustworthy remote identity. See [Nearby connection/authentication documentation](https://developers.google.com/nearby/connections/android/manage-connections).

Cleanup removed compiler-confirmed unused imports/dead DemoNote, consolidated repeated state refresh handlers, replaced stale pairing codes instead of ignoring updates, cleared ended requests, preserved pending names until resolution and ignored connection callbacks after Stop. The historical style layers were not broadly rewritten because current widget/artwork/animation preservation is a user requirement.

New help mode still needs physical two-phone automatic connection, ACK, three-phone relay and abuse-control acceptance. The prior emulator pairing failures remain unresolved evidence; enabling auto-accept is not proof that those radio I/O failures are fixed. Use NEXT_AGENT_CONTEXT.md as the takeover starting point.

Final cleanup verification: TypeScript noUnusedLocals/noUnusedParameters passed; production web and Android debug builds passed; APK assets match dist; package installed on 5558/5560. Two focused browser checks passed for default help-mode copy/selection and the separate SOS route. Automatic radio pairing and delivery were not claimed as verified.
