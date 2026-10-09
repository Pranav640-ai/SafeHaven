# SafeHaven / RescueMesh Native Integration

The consolidated `ui` branch connects the shared React interface to a Kotlin Capacitor plugin using Google Nearby Connections. It is based on the original `android-rescuemesh` classes in `main`, but **reimplements/fixes incomplete original manager code in `native/android/`**. Keep the originals for audit; only the corrected Kotlin sources are copied into the generated Android APK.

## Installation (Windows, macOS, Linux)

1. Install Node 22+, Android Studio (SDK, build tools and JDK 21), and Google Play services on physical Android phones.
2. Check out `ui`; run `npm install`.
3. Run `npm run android:init` once. This builds Vite, creates the normal Capacitor Android project if missing, installs the Kotlin bridge/dependency/permissions, and syncs web assets.
4. `npm run android:open` and build/run on **two real Android phones**.
5. After frontend changes, run `npm run android:sync`, then rebuild/reinstall the APK.
6. Re-run `node scripts/install-rescuemesh.mjs` if the generated Android project is re-created or Native Gradle is overwritten. The installer is idempotent.

If Gradle reports Java/Kotlin plugin compatibility errors, confirm Android Studio JDK 21 and generated Capacitor 7 Gradle versions. The installer expects standard Capacitor 7 Groovy Gradle files; for custom Kotlin DSL configurations follow the handoff rather than forcing the script.

### Connection test

- Open `RescueMesh → Nearby` on both phones and start discovery (grant permissions).
- Confirm both show the *same six-digit authentication code* for the pairing, then tap **Codes match** on each. Never accept if different.
- Once status is **Connected**, send a message from phone A; verify it appears on B, and A's message status changes to **Peer acknowledged**.
- Turn off mobile data and Wi-Fi internet. Nearby uses Bluetooth/Wi-Fi peer radios; keep required radios enabled. Repeat.
- For relay, use 3 devices A↔B and B↔C with no A↔C direct link. Verify payload reaches C; test TTL / duplicate behavior.
- On B publish a **Community beacon** (explicit GPS permission), then verify it appears on A. Stop sharing and verify revocation. Check expiry.
- SOS must be explicitly confirmed by the user. When no peers are connected it is **queued in memory only**, and could be lost if the app process is killed. Never represent offered as delivered; inspect acknowledgement state.

### Key limits to disclose

- This is not a tested replacement for emergency services, and the Android mesh is only available when phones participate, nearby radios are enabled, permissions are granted, and devices can form links.
- The implementation is app-managed best-effort forwarding, **not guaranteed delivery**, not a fully hardened offline messenger, and not secure against malicious authenticated peers. Nearby pairing auth codes help against accidental/unauthorized links; not a substitute for protocol-level identity, trust, or privacy reviews.
- SOS queue, chat and beacon store exist only while the app process remains alive. No durable encrypted persistence yet.
- Community beacons are self-reported and not official shelters; the distance/bearing is a straight-line estimate, not hazard-aware navigation.
- Users must opt into sharing precise location; nothing transmits location by default.
- The hosted web app has the same UI but no native Nearby radio bridge. It must say Android required rather than pretending to connect.

### Android permissions

The install script adds Bluetooth (legacy and Android 12+), **BLUETOOTH_ADVERTISE** (missing from the earlier draft), `ACCESS_FINE_LOCATION`, Nearby Wi-Fi and Wi-Fi state. Runtime permission requests are in the Kotlin plugin; geolocation requests a separate permission when the beacon is published.

### What was corrected from `main`

`android-rescuemesh/RescueMeshManager.kt` contains duplicate `forwardSOS` methods and is missing some functions/closing braces; `Beacon.txt` is not a valid Kotlin compilation unit, and automatic connection acceptance is unsafe. The integrated manager has explicit envelope types, deduplication, bounded TTL, session SOS queue, beacon expiry, opt-in GPS sharing, app-level ACKs and user-confirmed auth-code acceptance. **Originals on `main` remain untouched.**

## Consolidation verification (2026-10-10)

The consolidated `ui` frontend passed `npm run build` (TypeScript and Vite). Native setup scripts passed Node syntax checks. This workspace has no Android SDK, so the final Android build is left to the `ui` GitHub Actions workflow. Physical two/three-phone networking tests remain required; compilation alone does not prove delivery.
