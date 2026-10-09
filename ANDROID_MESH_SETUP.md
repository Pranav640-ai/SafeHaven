# Historical Android handoff

This document records the original standalone Kotlin review. Current setup is automated on `ui` by `npm run android:init`; follow [RESCUEMESH_INTEGRATION.md](RESCUEMESH_INTEGRATION.md) and `native/android/` for the integrated implementation. The snippets and blockers below describe the old sources on `main`.

# Nearby Connections: Android integration handoff

The current `main` branch contains standalone `android-rescuemesh/*.kt` sources, **not** a generated Capacitor Android project. There is no actual `android/app/build.gradle` or `android/app/src/main/AndroidManifest.xml` yet. When the Capacitor Android project is generated, make the following additions to the real files (do not replace their existing contents).

## `android/app/build.gradle`

Within its existing `dependencies { ... }` block:

```gradle
implementation "com.google.android.gms:play-services-nearby:19.3.0"
implementation "com.google.code.gson:gson:2.11.0" // RescueMeshManager uses Gson, if not already included
```

For Kotlin DSL (`build.gradle.kts`): `implementation("com.google.android.gms:play-services-nearby:19.3.0")`.

## `android/app/src/main/AndroidManifest.xml`

Within the outer `<manifest>` element, **outside** `<application>`:

```xml
<!-- Legacy Bluetooth permissions -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />

<!-- Android 12+ Bluetooth runtime permissions -->
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

<!-- Discovery/location where required by OS and Nearby Connections strategy -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
```

The first six permission names explicitly requested are included (with `BLUETOOTH_ADVERTISE` and Wi-Fi/network support added for Nearby Connections). Runtime permission requests are also required; adding manifest entries alone does **not** make discovery work. Do not assert all OS versions have identical permission rules: request only the necessary permissions for the actual device/API level and strategy.

## Current main-branch mesh source review (2026-10-10)

- `android-rescuemesh/RescueMeshManager.kt` currently has **two definitions of `forwardSOS`**, references an undefined `handleRelayMessage`, and appears to end with two unclosed braces. These are compile blockers.
- `BeaconStore.kt` refers to `Beacon`, but the model is in `Beacon.txt`, not a `.kt` compilation unit.
- Incoming payloads need explicit type discrimination. Blindly parsing any JSON into `SOSMessage` and returning can swallow relay/beacon messages or misleadingly interpret arbitrary input.
- Discovery currently auto-accepts connections. Add an authentication/consent UI using Nearby's authentication digits before treating peers as trusted.
- `P2P_STAR` supports a hub/spoke topology; application-level multi-hop A→B→C and acknowledgements still need proper forwarding, TTL/dedup and real multi-device verification.
- The SOS queue and beacon store are in-memory only; they are not durable offline storage and must not be represented as persistent.
- Before merge: add the Kotlin Capacitor plugin bridge, handlers for event/state updates, per-Android-version permission flows, disconnect cleanup and tests on **two physical phones**, then **three phones** for relay.

The UI branch still uses clearly labeled local demo state and does not claim that the mesh module is running.
