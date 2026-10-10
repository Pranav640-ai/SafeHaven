## Latest UI cleanup

Validation: TypeScript and production web build passed. All 18 browser checks individually reported pass (the runner stalled during final cleanup and was stopped after the checks), including native touch taps at the SOS/Mesh boundary on 320, 375, 390 and 430 px screens before and after scrolling. Home, Mesh and SOS screenshots were inspected. Android sync and debug APK assembly passed; reinstall the updated APK to see the cleanup.

Home Risk insights now asks the user to choose a destination; Explore cards still open their named place. The mobile dock uses five stable columns with separate touch targets and visible labels while scrolling. Mesh tab content renders directly rather than waiting for a tab animation. Developer preview instructions and the obsolete SOS modal were removed. Field/button/header alignment has been normalized. USER_GUIDE.md explains the complete navigation. Real two-phone mesh delivery still requires the acceptance checks in MESH_TEST_GUIDE.md; Google sign-in remains assigned to a teammate.

# SafeHaven final implementation handoff

## Work from this branch

Use `ui` in https://github.com/Pranav640-ai/SafeHaven. Do not merge old `main` Kotlin samples or design backup branches. Current implementation is React/TypeScript + FastAPI + one Capacitor Android APK. Read README.md, IMPLEMENTATION.md and MESH_TEST_GUIDE.md first. Preserve the sage/ivory theme, grid background, light font weights and existing icons.

## Current behavior

- Real page/browser Back history restores the preceding page and vertical scroll. Android Back uses one stable @capacitor/app listener reading current page/dialog state; at the initial Home it exits.
- SOS has its own page and dock selection. It does not highlight Mesh. Normal Mesh starts on Chats; its SOS tab is also available.
- Mesh previews all tabs/controls in browsers. Native-only actions remain visibly gray and disabled with an Android-required message. On Android, discovery can start without peers; messaging and beacon sharing activate after pairing. SOS can be queued while disconnected, with explicit consent and an in-memory limitation.
- Android 15 Wi-Fi permissions: scripts/install-rescuemesh.mjs now removes obsolete maxSdkVersion caps from ACCESS_WIFI_STATE/CHANGE_WIFI_STATE, including existing generated manifests. A native emulator run exposed SDK error 8032 before this repair. Discovery UI also uses actual discovering state rather than treating running as successful discovery.
- Mesh buttons have consistent light-weight typography, sage surfaces, borders, touch targets, focus states and gray disabled styling.
- Profile Language opens its own settings page. Guidance/report explanations support English/Hindi/Tamil/French/Spanish; the rest of the interface is English. French/Spanish need the online AI service.
- Contacts shortcut opens the pack's contact section; Home Quick check-in opens the real private-group form. Removed fake notification/sample-report controls, loading replay and the phone form without OTP.
- Backend source/forecast/replanning, offline packs, private groups and translations have implementations. Gemini is configured locally; credentials stay in backend/.env. Deployment, credentials and user accounts are separate from Nearby mesh.

## Google sign-in — explicit next task, not implemented

The user requested Google sign-in and elected to hand it to another person. There is currently no real account login, Firebase project configuration or authentication API. `authenticated` in src/App.tsx is only guest-entry UI state. Do not present it as authenticated identity or replace guest access with a fake Google button.

Suggested implementation: Firebase Authentication with Google for web and native Android, preserving guest/offline access. This is an implementation recommendation, not a dependency already installed.

1. Have the project owner create/select a Firebase project, enable Authentication → Google and configure the public app name/support email and any consent/test-user requirements.
2. Register a web app and Android app with package **com.safehaven.ai**. Configure actual web domains, including localhost for development where needed. Get Android debug/release signing fingerprints using `android/gradlew :app:signingReport`; register them in the project. Include the production signing identity when shipping.
3. Download the updated Android `google-services.json`; use it in generated `android/app/`. The generated Android folder is ignored, so add a documented reproducible configuration-copy/Gradle patch step rather than relying on an untracked one-off change. Private service-account keys and OAuth client secrets must never enter src/, Vite variables, the APK or Git.
4. Web: integrate the Firebase JS SDK and a Google provider. Invoke popup/redirect from a user gesture; support cancellation, blocked popups, expired sessions and the documented redirect-storage limitations.
5. Android: use Credential Manager / Google ID with Firebase, bridged into the existing Capacitor app, or a maintained Capacitor-compatible auth bridge after checking its version compatibility. Do not attempt Google login inside the embedded WebView. Return the verified credential/session to the React app and keep Android native and React session states synchronized.
6. Add one auth service/hook rather than putting SDK calls throughout App.tsx. Show Google profile name/email/avatar in Profile, restore signed-in sessions, provide real sign-out and keep Explore as guest working.
7. If Google identity is used by the FastAPI backend, verify Firebase ID tokens with the Admin SDK (issuer, audience, signature, expiry) and derive identity from the verified UID. Never trust email/UID sent as plain JSON. Current group capability tokens are independent; define an explicit migration instead of silently changing group authorization.
8. Decide the scope of account data. Signing in does not automatically sync local contacts/itineraries or establish identity in Nearby packets. Ask before uploading existing local private data. Avoid claiming cloud sync until implemented.
9. Acceptance: web desktop/mobile and installed APK login, account selection/cancellation, session restore/restart, expired/revoked token rejection, sign-out, guest entry, no network, authorized-domain/signing-fingerprint errors and no secrets in built dist/APK. Test credentials from the owner's real project are required for end-to-end validation.

Official references:
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/redirect-best-practices
- https://firebase.google.com/docs/auth/android/google-signin
- https://firebase.google.com/docs/android/setup

## Build and test

```powershell
npm install
npm run build
npm run api
# In another terminal, for local installed Edge:
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:web
.venv\Scripts\python.exe -m pytest backend/test_app.py -q
npm run android:sync
$env:JAVA_HOME='C:\Users\asus\.jdks\jbr-21.0.11'
.\android\gradlew.bat -p android :app:assembleDebug --no-daemon
```

JDK 21 is required by this generated Gradle project. The Android Studio bundled JBR here is Java 25 and fails with unsupported class-file version; the installed JDK 21 above works. Set Studio's Gradle JDK accordingly. `npm run android:emulator` creates a laptop-dependent live preview; normal `android:sync` restores packaged assets for offline tests.

## Automated two-emulator tests

Start both Pixel emulators, then after the packaged APK build run:

```powershell
npm run test:mesh
# Or explicitly select only these running emulator serials:
node scripts/test-mesh-emulators.mjs emulator-5554 emulator-5556
```

The script refuses physical-device serials, installs the APK, grants test permissions, enables radios, restarts the app and attaches to debug WebViews through ADB/CDP. The WebView adapter uses `noDefaults` (it cannot manage browser contexts/downloads), sets reduced motion before reloading (clearing old native listeners before that test-only reload). It drives existing React controls through DOM events because emulator pointer/animation stability checks can stall; it does not stub the Nearby API. It compares pairing codes before approving, tests bidirectional chat acknowledgement, SOS acknowledgement, disconnect/queue/cancel and Android Back. Results/screenshots are written to ignored `test-results/mesh-emulators/`. Reduced-motion tab transitions are supported by the app. Granting test permissions bypasses permission prompts; it does not verify the first-use consent UI. Native operation tests must use the actual bridge; browser disabled-preview tests do not prove networking.

Simulator success is preliminary: still perform MESH_TEST_GUIDE.md on two physical phones and three phones for a verified A↔B↔C relay. Pairing/chat may fail because of simulator radio support/settings; capture exact errors and don't claim success from build alone.

## Remaining limitations

- Google account login is not implemented; cloud sync is not implemented.
- Native SOS/chat/beacons are in memory; no durable encrypted queue or background-service guarantee.
- Peer acknowledgement confirms a peer received a packet, not user reading, all-recipient delivery or emergency dispatch.
- Community beacons are voluntary and unverified; straight-line bearing is not a safe route.
- Android permissions, disconnect/reconnect, physical range, offline internet isolation, three-device relay and TTL boundaries need device acceptance evidence.
- Hosting is not yet published. Native bundled API requests need a configured reachable HTTPS VITE_API_BASE_URL for online web tools; mesh does not need it. Never put Gemini keys in that public configuration.

## Verification evidence for this handoff

Final run (2026-10-10):

- **13 browser tests passed**: navigation/scroll history, dialogs, language preferences, every primary feature route, profile shortcuts, separate SOS dock selection, visible disabled mesh tabs/controls, mobile touch scrolling, saved packs/offline guidance and private group consent/status/leave.
- **9 backend tests passed** in this run.
- TypeScript/Vite build and generated Android debug APK build passed with JDK 21. APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Both Android 15 Pixel emulators installed the APK and exposed the real native bridge. **Native disconnected SOS queue and cancellation passed** (repeated, including the build with the stable Back listener). These were actual Kotlin operations, not browser mocks.
- Initial discovery revealed `8032: MISSING_PERMISSION_ACCESS_WIFI_STATE`. The installer has been corrected; the installed APK's ACCESS_WIFI_STATE and CHANGE_WIFI_STATE were verified granted.
- **Native pairing, chat/SOS recipient acknowledgements, Android hardware Back, beacons and multi-hop delivery are not verified.** Android window diagnostics showed `Application Not Responding: com.android.systemui` holding focus, which swallowed injected Back. Android reboot stalled. A full cold boot with software graphics also timed out before `sys.boot_completed`. Do not mislabel this as a passing mesh run or as a confirmed app Back failure.
- The two test VM processes were stopped after the failure. Their saved AVD data/settings were preserved; no AVD wipe was performed. They were Pixel_8 and Pixel_8_2, both configured with 2 GiB RAM/4 cores. The host had approximately 1 GiB free memory during the failing dual-VM attempt; this is diagnostic evidence, not proof of the root cause.

Next verification: use responsive Google Play enabled emulators or, preferably, the two/three physical phones in MESH_TEST_GUIDE.md. The helper is runnable as `npm run test:mesh`, excludes physical phones by default and reports exactly which stages passed/failed. First-use permission dialogs, radio range and internet isolation remain separate manual/device tests. Google sign-in remains the explicit unimplemented task above.

Local diagnostic files (ignored by Git): `test-results/mesh-emulators/`. The latest `results.json` records boot timeout; earlier successful native queue/cancel stages were observed in the terminal before retries overwrote that file. Do not infer unrecorded recipient delivery from those local sender states.
