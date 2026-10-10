# Meridian final mesh test guide

Use the `ui` branch and the generated `android/` project. Historical Kotlin snippets in `ANDROID_MESH_SETUP.md` are not the current app.

## Two physical phones — no Android Studio needed

Start with this two-phone test before the multi-phone acceptance below. The built APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Transfer **the same APK** to both Android phones by USB/file sharing and tap it in Files. Allow installation from that file app when Android asks. Install over the previous app to preserve data; do not uninstall it first. Both phones need Google Play services. No backend, Google sign-in, SIM, mobile data or shared Wi-Fi network is needed for nearby chat.

1. Turn on Bluetooth, Wi-Fi and phone Location on both phones; keep them 1–2 metres apart. Wi-Fi must be enabled, but internet is not required. Keep both screens unlocked and Meridian in the foreground.
2. Open **Mesh → Nearby** on phone A. Choose **Two phones: host** under Connection setup and give it a recognisable name such as Phone A. Leave Connection mode as **Nearby help network**. Tap **Start Nearby discovery** and grant the requested Nearby devices/location permissions. It should show **Waiting for phone**.
3. On phone B, choose **Two phones: join**, name it Phone B, and start. These roles use the same dedicated service and point-to-point strategy. Two hosts or two joiners will not connect. The automatic network uses a different service; do not mix it with these roles.
4. Wait for **Connected** and the other phone's name on both screens. Open Chats; send `Hello from A`, then `Hello from B`. Both must receive the correct message. Check the sender shows **Peer acknowledged**, not just Offered.
5. Turn off mobile data to repeat the messages. Leave Bluetooth/Wi-Fi/Location on. This verifies that chat does not depend on the API or internet.
6. Test SOS only with your consenting test partner: send a labelled test message and confirm receipt/acknowledgement. It does not call emergency services. Stop discovery on either phone; both should lose the link. Restart the host then join to test reconnection. A two-phone disconnection requires an explicit restart.
7. If no link appears within about 30 seconds, stop on both, check permissions in Android Settings and radio switches, then start Host first and Join second. If Android shows a permanent permission denial, enable it in Settings. Update Google Play services if requested. Record the exact in-app error, both phone models and Android versions. Startup failures now return to Stopped, so retry is available. If no error appears and discovery stalls, capture logs below; do not mark delivery as working.

Automatic nearby network remains the default and keeps multi-phone relay code. Host/join is a separate, simpler first acceptance path; no three-phone relay claim applies to point-to-point mode. Known-partner code comparison is still optional through Connection mode. Help-network names are unverified.

### Implementation references and evidence

Reviewed Google's [Nearby Connections WalkieTalkie sample](https://github.com/android/connectivity-samples/tree/main/NearbyConnectionsWalkieTalkie), [connection lifecycle guidance](https://developers.google.com/nearby/connections/android/manage-connections), [advertising/discovery guidance](https://developers.google.com/nearby/connections/android/discover-devices), and [permission requirements](https://developers.google.com/nearby/connections/android/get-started). The sample repository is archived; current API documentation supplies the permission/lifecycle guidance. Meridian adapts the connection tracking and separate advertiser/discoverer pattern in its existing Kotlin bridge; no whole third-party app was imported.

Fixes: suppress duplicate requests while an endpoint is connecting/pending/connected; serialise automatic advertising then discovery; clear failed startup state without deleting queued SOS/check-ins; check Play services/Bluetooth/older Android Location first; stop radio discovery/advertising once a two-phone link succeeds; display waiting/connected states and actionable error status codes. Builds/UI checks do not prove physical radio delivery. Physical acceptance remains unchecked until the two phones actually exchange acknowledged messages.

## 1. Install the packaged app on both devices

Run these commands in PowerShell from `C:\Users\asus\SafeHaven`:

```powershell
npm run android:sync
npm run android:open
```

The normal sync bundles the current UI and removes the emulator live-preview server URL. **Do not use `npm run android:emulator` for the offline acceptance test**: that preview needs the laptop's Vite server. Mesh itself does not need Vite, the backend or a Gemini key.

For automatic preliminary checks after building the APK, start two emulators and run `npm run test:mesh`. It grants emulator test permissions and performs real native pairing/message operations; physical and first-use permission tests below remain required.

In Android Studio, open this project's `android` folder, allow Gradle sync, select device A in the device dropdown and click Run. Repeat with device B. If using physical phones, enable Developer options and USB debugging, connect USB and approve the debugging prompt. Both devices must have Google Play services. Use JDK 21 (installed here at `C:\Users\asus\.jdks\jbr-21.0.11`). In Android Studio, Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK must select that JDK 21 path. The Studio bundled JBR is Java 25 and is too new for this Gradle version.

For your two virtual devices, start both from Device Manager and install by selecting each in turn. Use Google Play enabled images and an up-to-date emulator package. Nearby transport can still fail in an emulator even when permission and UI checks pass. Simulator discovery success is useful preliminary evidence; repeat the acceptance tests on two physical Android phones to check actual radios, range and permissions.

Optional APK build/install from PowerShell:

```powershell
$env:JAVA_HOME='C:\Users\asus\.jdks\jbr-21.0.11'
.\android\gradlew.bat -p android :app:assembleDebug --no-daemon
$meshAdb='C:\Users\asus\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $meshAdb devices -l
# Substitute each exact serial shown above. Never assume the connected physical phone is an emulator.
& $meshAdb -s emulator-5554 install -r .\android\app\build\outputs\apk\debug\app-debug.apk
& $meshAdb -s emulator-5556 install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

## 2. Pair A and B in known-partner mode

1. Start Meridian on both, choose **Explore as guest**, then **Mesh → Nearby**.
2. Select **Pair with a known traveller** on both devices. While stopped, set the visible device names to `TEST A` and `TEST B`.
3. Turn Bluetooth and Wi-Fi radios on. On older Android versions also turn on system Location. Keep both apps in the foreground, devices unlocked and initially within 1–2 metres.
4. Tap **Start Nearby discovery** on both. Grant the requested Nearby/Bluetooth permissions. Android 12 may also request location; beacon publishing requests location separately.
5. Both devices should show a pairing request and authentication digits. Compare the digits on both screens. Tap **Codes match** on both only when identical. The code length comes from Google Nearby; do not rely on a particular digit count.
6. Pass: A lists B as **Connected**, B lists A as **Connected**, each header shows one nearby phone, and pairing requests disappear. If it takes more than about 30 seconds, capture the displayed error and retry the troubleshooting steps below. This is a practical test timeout, not a promised discovery time.
7. Negative test: stop discovery on both, restart and tap **Reject** on one request. Pass: that connection does not become Connected. Restart discovery for a fresh attempt.

## 3. Chat and disconnected behavior

1. With the pair connected, open **Chats**. A sends `TEST A to B 001`.
2. Pass: B sees that exact text once, attributed to A. A initially shows **Offered to nearby peers**, then **Peer acknowledged** after an application-level acknowledgement.
3. B replies `TEST B to A 001`. Verify the same in reverse. Repeat with a few unique messages, punctuation and non-English text.
4. Stop discovery on B. Pass: A's connected count drops and chat sending is disabled when it has no peers. A must not show a new message as delivered when disconnected.
5. Restart B and compare/approve a new pairing code. Repeat chat.

**Meaning of acknowledgement:** it confirms receipt by a participating peer, not reading by a person, emergency-service dispatch or receipt by every phone in the network. The current UI does not identify which downstream recipient acknowledged.

## 4. Prove it works without internet

1. Use the packaged app installed in step 1. On physical phones turn off mobile data and disconnect from internet-providing Wi-Fi while keeping Wi-Fi and Bluetooth radios enabled. If using airplane mode, manually re-enable both radios; older phones may also require Location on.
2. Shut down the laptop Vite/API servers or disconnect the laptop. Open/reopen the installed app and pair the phones again if necessary.
3. Repeat A→B and B→A chat with new unique text. Pass: exact messages appear and acknowledgements return without an internet connection.
4. Do not count online private-group status sharing, weather requests or AI translation as mesh tests. Those are separate backend features.

## 5. SOS, queue, cancellation and reconnect

Only use messages clearly prefixed `TEST — no emergency`.

1. While connected, tap the central **SOS** button. It must open the standalone **Emergency SOS** page and highlight only SOS in the dock.
2. Type `TEST — no emergency — SOS A 001`. The send button must stay disabled until you check the delivery/queue acknowledgement box. Then tap **Relay SOS to nearby phones** (or **Queue SOS on this phone** when disconnected).
3. Pass: B's SOS tab shows the sender and full exact message; A changes from offered to **Peer acknowledged**. No emergency telephone call is made.
4. Stop discovery on both so there are no peers. On A queue `TEST — no emergency — queued SOS A 002`. Pass: the queue count becomes 1 and the status says **Queued on this phone until app closes**, not delivered.
5. Tap **Cancel pending SOS**. Pass: count becomes 0 and status becomes **Cancelled — not sent**. Pair again: B must not receive that cancelled test.
6. Disconnect again, queue a different test, then start discovery on A and B and pair. Pass: the queued count clears when it is offered, B receives the text, and only a returned acknowledgement changes its status to acknowledged.
7. Queue another test with no peers and tap **Stop discovery**. Pass: the queue clears and must not transmit on a later restart.
8. Queue a test and force-stop A from Android Settings → Apps → Meridian → Force stop. Reopen. Expected current limitation: the queue is lost. Swiping a task away does not always kill its process, so use Force stop for this check. Chat and beacon state are also in memory. Durable background delivery has not been implemented.

## 6. Beacons and permission denial

1. With peers connected, B opens **Beacons**, enters `TEST meeting point B`, chooses **15 minutes** and taps **Share my location temporarily**. Allow precise location when Android requests it. For an emulator set a position in Extended controls → Location first.
2. Pass: A receives the beacon with B's name, an expiry time and **Unverified** label. Nothing should share location before this explicit action.
3. On A tap **Show approximate distance & bearing** and allow location. Pass: a distance and north-based bearing appear. These are straight-line estimates, not navigation directions.
4. B taps **Stop sharing beacon**. While the pair remains connected, pass: the beacon disappears on both. A disconnected phone may retain an old copy until withdrawal reaches it or the beacon expires.
5. Publish another test and wait the selected 15 minutes without changing the device clock. Pass: it disappears from the visible list when expired. The UI refreshes expiration every second.
6. Separately deny location for a publish attempt. Pass: a useful error appears and no new location beacon is published. Restore permission in Android Settings and retry.
7. Stop discovery: local beacon state clears. This stop is not a guaranteed network-wide withdrawal. Use **Stop sharing beacon** while connected before stopping if recipients should receive a withdrawal.

## 7. Nearby check-ins

1. Keep A/B connected. On A open **Profile → Offline pack**, scroll to **Nearby check-in**.
2. Pass: safe/help controls are disabled until the separate nearby sharing consent checkbox is checked.
3. Check consent and tap **Share safe status nearby**. Pass: B's Chats receives `Check-in: safe`. Repeat `needHelp` after consenting again.
4. No location should be attached to check-in messages. An online private group in the same pack is a different transport and needs the backend.

## 8. Three-device relay test — required for a mesh claim

Two devices demonstrate a direct peer link, not multi-hop forwarding.

1. Install the same APK on a third phone C. Establish A↔B and B↔C, approve matching codes for each.
2. Ensure **A has only B as a peer and C has only B**; B lists A and C. Discovery automatically requests connections, so prevent the A↔C link by rejecting its pairing requests or using separation/range. Record peer lists before each test. If A and C are directly connected, the relay test is invalid.
3. A sends a unique chat and then a clearly labeled TEST SOS. Pass: C sees each exact message once with A as original sender, even though C is not paired to A. Repeat C→A.
4. Stop B. With no A↔C link, pass: new messages cannot reach the other end; no false confirmation appears. Reconnect B, reapprove codes and repeat.
5. Optional triangle: connect all three directly, send one message and check each recipient displays it once despite forwarding paths. Deduplication suppresses repeated packet IDs.
6. The source starts forwarding packets at TTL 4 and decrements on forwarding. This is a bounded relay budget, not proof of a four-device limit. Three phones cannot validate the boundary; a controlled longer chain or a native protocol test harness is needed for exhaustive TTL tests.

## 9. Navigation and final acceptance record

- Explore → Safety essentials → Back returns to Explore; another Back returns to the preceding page.
- Profile → Language opens **Language settings**, choosing a language saves it, Preview safety guidance opens the guide, and Back returns to Language settings.
- Profile → Contacts opens the contact section. Back returns to Profile.
- Android system Back behaves like the visible page Back; an open dialog closes first. At the initial Home screen, system Back exits the app.
- SOS opens its own relay screen. In browsers the relay fields/buttons are visible but disabled; View emergency guidance remains available. The Mesh tabs also stay visible as disabled previews.
- Repeat after screen rotation and a disconnect. Record failures instead of treating a successful APK build as proof of radio delivery.

Record: APK commit/build date, device models/API levels, physical vs emulator, emulator version, permissions, connection topology, test message IDs/text, observed sender statuses, recipient screenshots and pass/fail per section. Keep test messages free of real emergency/personal data.

## Troubleshooting

- Android required message: you opened the website, not the installed APK.
- Blank app / cannot connect to 10.0.2.2: it is still a live preview build. Run normal `npm run android:sync`, rebuild and reinstall.
- `MISSING_PERMISSION_ACCESS_WIFI_STATE`: run current `npm run android:sync`, rebuild and reinstall. The current installer repairs an older manifest that limited Wi-Fi state permissions to API 31; the bundled Nearby SDK needs them on Android 15 too.
- Permission error: Settings → Apps → Meridian → Permissions; enable the requested Nearby devices/Bluetooth/location permissions. Then stop/restart discovery. Nearby requires the permissions appropriate to the device's Android version.
- No discovery: verify same APK/service, Google Play services, radios, required system Location, foreground apps and matching supported emulator networking settings. Restart discovery on both before escalating.
- Acknowledgement missing: inspect the recipient first, confirm pairing and link state, and capture the error. Offered is not confirmed delivery.
- Lost queued SOS after Force stop: expected in-memory limitation.
- Weather/translation failures while offline: expected separate online service behavior; saved pack contents should still open.

Optional device logs, from a clean test session (replace serial):

```powershell
$meshAdb='C:\Users\asus\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $meshAdb -s emulator-5554 logcat -d -v time > mesh-A-log.txt
```

Review logs for sensitive data before sharing. Report the failed step, device/API, peer list, exact visible error and log excerpt.

## Local automated run result (2026-10-10)

The two Pixel Android 15 emulators installed the APK and passed native SOS queue/cancel. The first attempt exposed a Wi-Fi permission cap in the installer, now fixed and verified granted. Pairing/delivery did not complete: System UI ANR took Android window focus and swallowed Back events; reboot/cold boot retries then stalled. The test VMs were stopped without wiping data. Use responsive emulators or physical phones for the remaining tests; do not call the mesh field-verified.

For an ANR/stalled VM, use Device Manager's Cold Boot and inspect its graphics/resources/system image. Software rendering is a supported diagnostic alternative, not a guaranteed fix: [graphics acceleration](https://developer.android.com/studio/run/emulator-acceleration), [cold-boot command options](https://developer.android.com/studio/run/emulator-commandline). It was attempted here and did not complete boot.

## Official references

- [Google Nearby setup and permissions](https://developers.google.com/nearby/connections/android/get-started)
- [Google Nearby pairing and authentication](https://developers.google.com/nearby/connections/android/manage-connections)
- [Android Emulator networking](https://developer.android.com/studio/run/emulator-networking)
- [Android multi-device emulator support](https://android-developers.googleblog.com/2026/04/Test-Multi-Device-Interactions-with-the-Android-Emulator.html)

## Current persistent queue acceptance

Pending SOS, carried SOS and the latest queued nearby check-in now use encrypted Android Keystore storage, bounded to 24 hours. Chat history remains in memory. Queue while disconnected, force-stop, reopen/start Nearby, pair and verify peer ACK removes pending entries. Explicit Stop clears local queues; cancellation cannot retract a peer copy already relayed. Test expiry and fresh-install permission denial separately. No background delivery is promised. Verify beacon capacity/expiry/withdraw, true-heading compass and sensor fallback, installed offline TTS and three-phone store/carry/forward on physical hardware. See FINAL_HANDOFF.md for latest measured results.

Automated runs with more than two devices must pass explicit serials and select pairing requests by counterpart name, not the first visible request. The current harness filters MESH TEST A/B and compares matching digits. Prefer stopping unrelated discovery manually before an isolated pair test; do not accept a different phone just to make the test pass.

Latest measured attempt (10 October): final APK installed on 5558/5560, disconnected SOS queue/cancel and hardware Back passed. Selected-pair discovery timed out with STATUS_ENDPOINT_IO_ERROR (8012). Connected message/SOS ACK and physical/multi-hop acceptance remain unverified.

## Automatic nearby help network acceptance (current default)

Choose Nearby help network on two physical phones and start discovery on both. No code comparison dialog should be required: onConnectionInitiated accepts a connection only while the participant has started that mode. Check that both phones show the other as connected with a self-reported name, then verify two-way chat ACK, queued SOS ACK and explicit check-in/location consent. Test unknown participants, disconnect/reconnect, Stop while a connection is pending, force-stop persistence and three-phone store/carry/forward. All received content stays unverified; do not infer rescuer identity from a display name.

The emulator script deliberately selects known-partner mode for its code test. Its previous radio errors are not resolved by the mode change. Default help-mode physical acceptance remains required. No background service or long-range discovery is implemented.

Current visual/scope reference: [AGENTS.md](AGENTS.md), [UI_CHECKLIST.md](UI_CHECKLIST.md) and [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md). The six Home and three trip-card styled SVG illustrations are fixed; historical emoji artwork must not replace them.

## Updated APK acceptance: contacts, check-in and beacon

Current online backend: https://safehaven-production-9f5d.up.railway.app. Nearby radios operate independently of this backend. Install the same android/app/build/outputs/apk/debug/app-debug.apk on both physical phones as an update; keep saved data. Android Studio is optional.

1. Open Meridian on both phones; guest access is enough for Mesh. Keep apps foreground, Bluetooth/Wi-Fi/Location on and accept requested Nearby/location permissions. In Mesh → Nearby, set distinct names, choose Two phones: host on A and Two phones: join on B. Start A, then B. Both must show the counterpart connected.
2. Chats: A sends a unique message to B; B replies. Verify actual received text and peer acknowledgement on each sender. A visible outgoing bubble alone is not delivery.
3. SOS: send a clearly labelled test request (do not call emergency numbers). Verify B receives the test and A gets peer acknowledgement. Test a disconnected queued request/cancel separately; cancellation cannot retract delivered copies.
4. Safety pack → Nearby check-in: explicitly grant status-sharing consent, then send safe/need-help status. Verify the counterpart's received check-in. These statuses are independent of private online groups.
5. Home → Safety beacon on A: enter a meeting-point label, optional capacity and expiry; tap Share my location temporarily and allow GPS access. B opens Beacons: verify label, sender, expiry and GPS point. On B, tap Show approximate distance & bearing. Approximate/denied permissions and compass availability must be handled visibly; bearing is not a safe route.
6. On A, Stop sharing beacon. Verify removal on connected B; disconnected peers may retain their copy until withdrawal is relayed or expiry. Repeat reconnection with active beacon and verify no duplicated entries. Expiry acceptance requires waiting for the configured expiry; no browser clock fixture counts as physical acceptance.
7. Turn mobile data off while keeping Bluetooth/Wi-Fi/Location on and repeat chat/check-in/beacon reception to confirm independence from internet. Reconnect before online weather/Google/group checks.
8. Profile → Contacts: edit a saved number, confirm the tel link opens the phone dialler, restart and check it remains saved. Google sign-in: test a real account, cancellation, restart persistence and sign-out separately.

Record device models/Android versions, permission choices, successful receipts and any Nearby error codes. After two-phone acceptance, proceed to deployment configuration and the online buddy plan in BUDDY_SYSTEM_PLAN.md. Multi-hop/force-stop/background delivery remain separate acceptance gates.
