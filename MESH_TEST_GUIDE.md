# SafeHaven final mesh test guide

Use the `ui` branch and the generated `android/` project. Historical Kotlin snippets in `ANDROID_MESH_SETUP.md` are not the current app.

## 1. Install the packaged app on both devices

Run these commands in PowerShell from `C:\Users\asus\SafeHaven`:

```powershell
npm run android:sync
npm run android:open
```

The normal sync bundles the current UI and removes the emulator live-preview server URL. **Do not use `npm run android:emulator` for the offline acceptance test**: that preview needs the laptop's Vite server. Mesh itself does not need Vite, the backend or a Gemini key.

In Android Studio, open this project's `android` folder, allow Gradle sync, select device A in the device dropdown and click Run. Repeat with device B. If using physical phones, enable Developer options and USB debugging, connect USB and approve the debugging prompt. Both devices must have Google Play services. Use JDK 21 (installed here at `C:\Users\asus\.jdks\jbr-21.0.11`). In Android Studio, Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK must select that JDK 21 path. The Studio bundled JBR is Java 25 and is too new for this Gradle version.

For your two virtual devices, start both from Device Manager and install by selecting each in turn. Android Emulator 36.5+ supports shared multi-instance Wi-Fi and simulated Bluetooth on supported system images. Use Google Play enabled images, API 31+ and the latest emulator package. Simulator discovery success is useful preliminary evidence; repeat the acceptance tests on two physical Android phones to check actual radios, range and permissions.

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

## 2. Pair A and B

1. Start SafeHaven on both, choose **Explore as guest**, then **Mesh → Nearby**.
2. While stopped, set the visible device names to `TEST A` and `TEST B`.
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

1. While connected, tap the central **SOS** button. It must open **RescueMesh → SOS** directly.
2. Type `TEST — no emergency — SOS A 001`. The send button must stay disabled until you check the delivery/queue acknowledgement box. Then tap **Queue / relay SOS**.
3. Pass: B's SOS tab shows the sender and full exact message; A changes from offered to **Peer acknowledged**. No emergency telephone call is made.
4. Stop discovery on both so there are no peers. On A queue `TEST — no emergency — queued SOS A 002`. Pass: the queue count becomes 1 and the status says **Queued on this phone until app closes**, not delivered.
5. Tap **Cancel pending SOS**. Pass: count becomes 0 and status becomes **Cancelled — not sent**. Pair again: B must not receive that cancelled test.
6. Disconnect again, queue a different test, then start discovery on A and B and pair. Pass: the queued count clears when it is offered, B receives the text, and only a returned acknowledgement changes its status to acknowledged.
7. Queue another test with no peers and tap **Stop discovery**. Pass: the queue clears and must not transmit on a later restart.
8. Queue a test and force-stop A from Android Settings → Apps → SafeHaven → Force stop. Reopen. Expected current limitation: the queue is lost. Swiping a task away does not always kill its process, so use Force stop for this check. Chat and beacon state are also in memory. Durable background delivery has not been implemented.

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
- SOS opens the Android relay screen; browser SOS opens guidance access with an explicit no-send notice.
- Repeat after screen rotation and a disconnect. Record failures instead of treating a successful APK build as proof of radio delivery.

Record: APK commit/build date, device models/API levels, physical vs emulator, emulator version, permissions, connection topology, test message IDs/text, observed sender statuses, recipient screenshots and pass/fail per section. Keep test messages free of real emergency/personal data.

## Troubleshooting

- Android required message: you opened the website, not the installed APK.
- Blank app / cannot connect to 10.0.2.2: it is still a live preview build. Run normal `npm run android:sync`, rebuild and reinstall.
- Permission error: Settings → Apps → SafeHaven → Permissions; enable the requested Nearby devices/Bluetooth/location permissions. Then stop/restart discovery. Nearby requires the permissions appropriate to the device's Android version.
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

## Official references

- [Google Nearby setup and permissions](https://developers.google.com/nearby/connections/android/get-started)
- [Google Nearby pairing and authentication](https://developers.google.com/nearby/connections/android/manage-connections)
- [Android Emulator networking](https://developer.android.com/studio/run/emulator-networking)
- [Android multi-device emulator support](https://android-developers.googleblog.com/2026/04/Test-Multi-Device-Interactions-with-the-Android-Emulator.html)
