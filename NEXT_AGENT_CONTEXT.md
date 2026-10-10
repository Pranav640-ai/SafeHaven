# Meridian takeover context - current state

Start here, then read FINAL_HANDOFF.md, FEATURE_AUDIT.md and MESH_TEST_GUIDE.md. Canonical branch ui, repository https://github.com/Pranav640-ai/SafeHaven. Recent commits before this final cleanup: 6b61d84 safety implementation, 811bf0d visual restoration/approval/location fix. Use git log for the newest cleanup commit. Old CODEX_HANDOFF.md and older design branches are historical.

## User constraints

Preserve sage/ivory palette, existing fonts, fixed styled SVG card/carousel artwork from 6b61d84, icons/widgets, static grid background, short green notifications, outline shimmer on every page and animated compact dock. Make only necessary UI changes; do not replace functional screens with old demonstration screens. Never fabricate live alerts, shelters, routes, connected peers, Google login or successful delivery. Keep updates concise and use focused tests, not repeated full-suite runs.

## Product journey / current behavior

Guest Home shows selected destination and opens its check, with working Notifications and Menu. Generic hero asks for a town, not Manali. Destination/date check -> weather/reports/Map -> itinerary proposal -> Original/Proposed comparison and reasons -> approval updates saved Original and Proposed shows no pending changes -> offline pack. Approval persists across reload. Back follows history; SOS/Mesh targets are separated at 320/375/390/430px. Private groups and nearby phones are separate audiences/consents.

Mesh default Nearby help network automatically accepts participating nearby phones after explicit Start discovery; no in-person meeting/code comparison. The native start option is allowUnverified. Known-partner mode retains comparison. Names/messages are unverified; this is foreground radio-range communication, not remote tracking or guaranteed rescue. SOS queues are encrypted and bounded to 24h; cancel/Stop cannot retract already-relayed copies. No background service. User explicitly requested this lost-traveller flow.

## Where to work

src/App.tsx: navigation, Home controls, preserved artwork/loading/dock. src/features/TravelTools.tsx: destination, itinerary/approval, guide, pack/groups. src/features/LocalConditions.tsx: real map/report/route/photo. AreaWarnings.tsx: signatures/expiry. EmergencySupport.tsx: phrases/voice/source questions. ResponseDashboard.tsx: private /response, isolated simulator. backend/app.py, safety.py, push.py: APIs, community/operator data and opt-in push. src/mesh/useRescueMesh.ts + RescueMeshScreen.tsx: controller/UI. native/android/com/safehaven/rescuemesh/: Nearby, encrypted queue and native offline TTS. scripts/install-rescuemesh.mjs installs tracked sources into generated ignored android/; never keep a fix only there.

## Build/run

Windows workspace C:\Users\asus\SafeHaven. npm ci; npm run api (Python .venv prerequisite); npm run dev. Built site also served by API at http://127.0.0.1:8000. npm run android:sync; JDK21 C:\Users\asus\.jdks\jbr-21.0.11; android/gradlew.bat -p android :app:assembleDebug --no-daemon. Quote -Pandroid.injected.testOnly=false in PowerShell if needed. APK android/app/build/outputs/apk/debug/app-debug.apk. SDK C:\Users\asus\AppData\Local\Android\Sdk. Studio Java25 is too new for this Gradle. Root android/ is ignored; native/android is tracked.

Production/online APK needs reachable HTTPS VITE_API_BASE_URL and rebuilding; npm run android:release:prepare checks it. Current local debug APK is packaged UI/offline Mesh, not a deployed API. Gemini exists in local backend config; GNews/maintained official directory coverage incomplete. Local publisher/VAPID/operator credentials are ignored; never print, commit or put secrets into frontend/APK. Firebase web sign-in and native Credential Manager bridge are integrated; Firebase Android registration/download and live account acceptance remain pending. Full Firebase/Credential Manager/server role/hosting instructions are in final handoff.

## Verified versus still unknown

Previous baseline: 22 browser and 21 backend checks passed. Latest restoration: six focused UI checks passed, approval/reload, Home controls/location and four dock sizes; web/Android builds passed and APK installed on responsive emulators 5558/5560. Native coarse/fine permission alias and modern request path fixed; merged manifest has no location max-SDK limit. Prior native tests proved bridge, disconnected SOS queue/cancel and hardware Back. Pairing did not pass: 5554/5556 had launcher ANRs; 5558/5560 discovery encountered 8011/8012 transport errors. Do not claim chat/SOS ACK, physical range, force-stop queue restoration, compass, native speech or three-phone relay passed. New automatic help mode needs fresh physical acceptance.

Use PLAYWRIGHT_CHANNEL=chrome for tests (bundled browser unavailable). Backend: .venv/Scripts/python.exe -m pytest backend/test_app.py backend/test_safety.py -q. Native emulator script now explicitly selects verified mode and named counterpart requests, not the first unrelated phone. Latest compile checks noUnusedLocals/noUnusedParameters; preserve those cleanup results.

## Next work in order

1. Two physical Google Play services phones: automatic help mode, two-way chat/SOS ACK, permission denial/approximate location, Stop pending connections; then three-phone store/carry/forward and encrypted force-stop/expiry acceptance. Capture Nearby logs/status codes; diagnose radio errors rather than mock success.
2. Public network application identity/signature and abuse limits; optional pre-trip trusted-group provisioning. No claiming anonymous display names are authenticated.
3. Deploy persistent HTTPS API, configure Android API base; complete native Google account acceptance, server ID-token validation and operator roles.
4. Maintained official warning/closure/shelter/consular feeds, translation review, real AI/photo/browser-push acceptance. Licensed offline maps and native FCM/SMS remain gaps.
5. Shared Trip and navigation registry, split TravelTools, carefully consolidate old CSS without visual changes. Full feature audit lists partial and absent items.

Final cleanup verification: TypeScript noUnusedLocals/noUnusedParameters passed; production web and Android debug builds passed; APK assets match dist; package installed on 5558/5560. Two focused browser checks passed for default help-mode copy/selection and the separate SOS route. Automatic radio pairing and delivery were not claimed as verified.

Current visual/scope reference: [AGENTS.md](AGENTS.md), [UI_CHECKLIST.md](UI_CHECKLIST.md) and [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md). The six Home and three trip-card styled SVG illustrations are fixed; historical emoji artwork must not replace them.

Latest UI decision: two duplicate Home preparation widgets removed (mini-checklist and trip-note editor); Safety pack remains canonical and reads legacy note data when no hotel field exists. The six cards and three For your next trip cards are retained. Profile name edit uses Pencil; gear opens Settings rather than About. Follow the new repository AGENTS.md visual freeze.

Latest validation: three focused browser checks passed for fixed SVG artwork (6 + 3), duplicate removal/legacy note retention, Profile edit/settings, dialog Back/SOS and all Home/core routes. TypeScript strict unused checks, production web build and final Android build passed. APK assets match dist and the package installed on 5558/5560. Physical Mesh/production acceptance gaps remain unchanged.

Product rename: the visible name is Meridian (including Android launcher, PWA, notifications and API messages). Existing com.safehaven.ai / com.safehaven.rescuemesh identifiers, saved-data keys, database filenames and GitHub/workspace paths intentionally remain compatible. Do not rename those without a migration. App icon remains the licensed Lucide shield-check; native/resources is copied by android:sync.

## Two-phone Nearby repair

Mesh → Nearby now offers Automatic nearby network (existing default), Two phones: host, and Two phones: join. The latter share a separate point-to-point service; never mix roles with the automatic cluster service. Follow the physical-phone/no-Studio instructions at the top of MESH_TEST_GUIDE.md. Duplicate request suppression, startup failure reset preserving queued data, radio/Play services checks and two-phone connected/waiting states are implemented. Google sample/API references are in that guide. Physical pairing/chat/SOS ACK remains unverified; no phones were attached during this repair. Existing automatic help participation, UI artwork and message/relay formats remain intact.

Repair validation: TypeScript/production web and Android debug builds passed. One focused browser check passed for Host/Join controls, automatic help default and known-partner mode. APK assets match the current dist and its Capacitor config has no live-preview server. No physical radios were available; pairing/delivery remains unverified.

## Combined UI, Firebase login and Mesh

Canonical integration uses the preferred Meridian shell/navigation/artwork from 0472f2f, the current origin/ui Google login layout/error fixes through 402bb44, and the intact 02e320d two-phone Mesh repair. The branch named GoogleLoginPage currently points at the older standalone android-rescuemesh prototype and has no web frontend; it was reviewed, not merged wholesale. src/styles.css restores only the removed alignment, dock morph and outline-shimmer overrides. Home artwork/widgets, six feature routes, destination warning chooser, history/scroll restoration, trip approval, language guidance links and privacy copy remain present.

Firebase web popup login, observed/persisted Firebase session, signed-in profile email and sign-out are integrated with the preferred shell. Android uses MeridianAuthPlugin (Credential Manager) to obtain a Google ID token, then exchanges it with Firebase JS signInWithCredential. It does not open Google's login inside an embedded WebView. Guest access remains available for offline Mesh. This login does not authenticate anonymous Mesh names or grant backend operator roles; backend ID-token verification is still outstanding.

Android project registration: in Firebase safe-havenai register com.safehaven.ai, add the actual signing certificate SHA-1, enable Google, download native/google-services.json locally and rerun npm run android:sync plus assembleDebug. The file is ignored. capacitor.config.ts validates its project/package and obtains the Web OAuth client ID (client_type 3); this ID is public client configuration, not a server secret. GOOGLE_WEB_CLIENT_ID is an optional environment alternative, but project/SHA registration is still required. Missing Android configuration produces an honest login error with guest access; never claim live Google sign-in passed without an account test.

Debug SHA-1 for this laptop: BB:56:F3:6B:F2:4A:1D:1F:A5:67:F3:D4:8B:28:72:4B:BA:BC:6C:76. A different signing key or release key requires registering its own fingerprint. No project service-account keys belong in the frontend/APK. See GOOGLE_SIGNIN_SETUP.md for exact steps.

Combined validation: production web and Android debug builds passed; five focused browser checks passed for login frames/mobile layout, guest navigation, fixed artwork/Profile and Mesh setup. Additional focused checks passed for four dock widths, separate SOS/Mesh routes and guest logout. APK assets match dist, native MeridianAuthPlugin/RescueMeshPlugin and two-phone service are present, and no live-preview server is configured. All four Mesh files match 02e320d. Google account login remains untested until project configuration and a real account test; no physical Mesh delivery claim.

Incoming origin/ui commits 13d44dd/49c9d23 were also merged. Route-loading starts before a real page change; same-page dialog Back is guarded to avoid a stuck skeleton. Two focused history/scroll and dialog/SOS Back checks passed after this merge. Final combined APK/web builds passed and packaged assets match dist. Firebase Android config file was still absent at this build; guest and Mesh are usable, native account login awaits the user’s registration/download plus rebuild.
