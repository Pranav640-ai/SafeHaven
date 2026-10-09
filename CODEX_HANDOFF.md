# Codex engineering handoff — SafeHaven AI

**As of 2026-10-10.** This file is an actionable handoff, not a claim of a completed or field-proven emergency system.

## Mandatory first action

Open https://github.com/Pranav640-ai/SafeHaven and check out **`handoff/risk-ui-onboarding-codex`**. It is based on `feature/rescuemesh-android-bridge` and contains the user's last requested UI fixes. Read `README.md`, `RESCUEMESH_INTEGRATION.md`, `package.json`, `capacitor.config.ts` and the native bridge source. **Do not start from `main`**: it currently holds incomplete standalone Kotlin experiments but not the integrated frontend.

Branches/PR:
- `main`: https://github.com/Pranav640-ai/SafeHaven/tree/main
- Restored UI baseline (`ui`): https://github.com/Pranav640-ai/SafeHaven/tree/ui
- Bridge: https://github.com/Pranav640-ai/SafeHaven/tree/feature/rescuemesh-android-bridge
- Codex starting branch: https://github.com/Pranav640-ai/SafeHaven/tree/handoff/risk-ui-onboarding-codex
- Draft integration PR #1: https://github.com/Pranav640-ai/SafeHaven/pull/1

## Product constraints (locked)

Build **one React application, one Python FastAPI backend when ready, and one Android APK** through Capacitor; the Android Kotlin Nearby plugin is inside the same app. Keep five modules: Risk Intelligence, minimum-disruption Trip Replanner, sourced Multilingual Emergency Guidance, RescueMesh (includes Community Safety Beacon), Offline Safety Pack/group check-in. The web experience must not claim it can send offline Nearby packets.

Do not build a separate RescueMesh APK. No fabricated live weather/incident/news or source provenance. No generated emergency data presented as verified. Never label voluntary beacons as official shelters; no automatic “safe route” claim. User opt-in required for sharing precise location/check-ins. SOS or chats can only show delivered after the correct receiver acknowledgement. Avoid exposing API keys in the frontend/APK.

## Last UI changes — preserve all other UI decisions

1. **Risk Intelligence**: `src/App.tsx` gained `risk-view-tabs` only on the Overview / Weather / Reports tab group. `src/styles.css` styles a tidy equal-width segmented control, removes the old underline/gradient indicator and keeps selected-state contrast.
2. **Explore headline**: “Take the scenic route.” now uses regular-weight italic **Cormorant Garamond** (loaded from Google Fonts), instead of heavy Abril styling. Scoped to `.explore-editorial h3`.
3. **Onboarding**: “Go further. Stay prepared.” retains the full scenic blue background to/below its headline before the form starts. Scoped to `.phone-onboarding` CSS, including small-height viewport sizing.
4. **Cleanups**: Removed unused `embla-carousel-react` dependency (cards use `SwipeRow` native scrolling), removed references to the nonexistent `/visuals/sunset-trail.webp` fallback (image hides on failure so the hero gradient remains), and replaced outdated README text.

**Do not broadly redesign Home, Profile, colors, fonts or bottom dock without a new explicit request.** The user considers the current look good.

## Run and build

```bash
git clone -b handoff/risk-ui-onboarding-codex https://github.com/Pranav640-ai/SafeHaven.git
cd SafeHaven
npm install
npm run dev
npm run build
```

Node.js 22 recommended. Test at phone viewport widths 320, 375, 390, 430 and 768 px, plus a real Android phone. Validate Risk tabs (selected and keyboard-focus styles), scenic headline, login background at short/tall phone heights, existing carousels/vertical scroll, and SOS UI honesty. Check browser console and Vite build; do not silently suppress TypeScript errors.

For Android, use Android Studio with JDK 21 and SDK; physical Google Play services phones:

```bash
npm run android:init
npm run android:open
```

On subsequent edits `npm run android:sync`. Android is generated under `android/`; the installer modifies real Gradle files, manifest permissions, MainActivity plugin registration and copies Kotlin source. The native plugin is **not the incomplete old `main/android-rescuemesh/RescueMeshManager.kt`**.

## Code entry points

- `src/App.tsx`: shared app shell, Risk/Explore/Login and other React pages, navigation and page transitions.
- `src/styles.css`: **only** shared compiled theme stylesheet; legacy override file was already removed.
- `src/mesh/useRescueMesh.ts`: type-safe Capacitor API, hardware/platform guard, events, peer/messages/beacons/SOS state.
- `src/mesh/RescueMeshScreen.tsx`: Android Chats / Nearby / Beacons / SOS UI, permissions, peer code prompt.
- `src/mesh/mesh.css`: scoped native feature UI styles.
- `native/android/com/safehaven/rescuemesh/RescueMeshPlugin.kt`: Capacitor plugin methods, Android versioned permission flow.
- `native/android/com/safehaven/rescuemesh/RescueMeshManager.kt`: Nearby `P2P_CLUSTER`, forwarding, deduplication, acknowledgements, SOS/beacons.
- `scripts/install-rescuemesh.mjs`, `scripts/init-android.mjs`: repeatable native setup.
- `RESCUEMESH_INTEGRATION.md`: exact testing and security limitations.
- `.github/workflows/ui-build.yml`: frontend build on selected branches/PRs. Check branch coverage and GitHub Actions logs before interpreting CI.
- `capacitor.config.ts`: `com.safehaven.ai` Android app.
- `main/android-rescuemesh/`: original teammate's exploratory Kotlin source, not a build-ready Android project.

## Readiness matrix

| Feature | Current state | Next engineering action |
| --- | --- | --- |
| Core React pages and Vite bundle | Integrated UI; previous builds passed | Re-run build after this handoff UI patch; polish only reported regressions |
| Capacitor packaging / Kotlin build | Previously compiled to debug APK | Rebuild from current commit; install on multiple devices |
| Nearby discovery and authentication | Implemented in native bridge, **not field-tested** | Pair two real Android devices; compare displayed codes and approve |
| Offline chats / acknowledgements | Native message paths implemented, **not field-tested** | Send A→B, verify B receives and A receives explicit acknowledgement |
| Relay | Best-effort TTL/dedup in native source | A↔B↔C isolated topology, latency, duplicates, reconnect tests |
| SOS | In-memory queue, consented sending; may be lost if process dies | Durable storage, process restart, status semantics and ack tests |
| Community Safety Beacon | Opt-in broadcast, expiry, withdraw, approximate GPS guidance | Permission denial, expiry, withdrawal across real peers; guard spoofing |
| Offline pack / group check-in | Partial UI and primitive mesh check-ins | Cached data persistence, consent/sharing, sync conflict behavior |
| Weather, official alerts/news, incident provenance | UI/sample content only | Design FastAPI endpoints and integrate real, timestamped sourced providers |
| Gemini trip replanning and multilingual guidance | UI/sample content only | Server-only credentials, grounding, conservative disruption-aware logic |
| Map/routing and deployment | Architecture planned | Leaflet/OSM integration, no unsourced safe-route claim; Vercel/Railway deploy |

## Device test protocol (blocking merge)

1. **Web baseline:** `npm run build`; verify login, Risk tabs, Explore and the original v7 look. Confirm web Mesh displays platform limitation.
2. **Native startup:** install debug APK on Android phones A and B, approve Nearby/Bluetooth/Wi-Fi/location permissions only as needed. Test Android API version differences and denial flows.
3. **Pairing:** advertise + discover on both; compare the same six-digit authentication code; approve both. Reject mismatched codes. Observe disconnection/reconnection.
4. **Messaging:** disable internet, keep Wi-Fi/Bluetooth *radios* enabled. Send A→B; require B receive event and A peer acknowledgement. Test duplicates, payload size, app backgrounding.
5. **Relay:** add C with B↔C only; send A→C. Confirm TTL prevents loops and dedup works. Test latency, moved phones, lost peer.
6. **SOS:** consent confirmation, queue when offline, reconnect then offer, acknowledgement, cancellation, app/process kill and restart; **persist safely before claiming reliable queueing**.
7. **Beacon:** explicit GPS permission, create temporary unverified refuge, view on other phone, check distance/bearing if sensors exist, expire/update/revoke and ensure peer removal propagates.
8. **Safety review:** do not imply a beacon is officially approved, a route is safe, SMS is sent or emergency responders were contacted. Screens need truthful timestamps and delivery state.

Record device make/model, Android version, Google Play services status, radio/network setup, logs (`adb logcat`) and outcomes; attach evidence to the PR.

## Remaining backend plan (after native validation)

Suggested Python FastAPI contract (design first; no backend exists yet): destination lookup, `/weather` (Open-Meteo), `/incidents` (source + published timestamp + status), `/replan` (original/revised itinerary + reason + provenance), `/guidance` (source-linked translations), optional Supabase account/group APIs. The UI must present empty/error/offline states, not fabricate incident certainty. Keep Gemini/news API secrets server-side. Use a stable typed front-end adapter instead of adding business logic throughout `App.tsx`.

## Git process / safety

The new UI handoff is **not included in draft PR #1 yet**. Prefer a reviewed PR from `handoff/risk-ui-onboarding-codex` into `feature/rescuemesh-android-bridge`, then refresh PR #1 into `main` once tests pass. Do not force-push over teammates or merge untested mesh behavior into `main`. Make focused commits, keep a rollback reference, and update docs based on observed build/device outcomes, not assumptions.

**Definition of done for integration:** frontend build green, Android build green on the final commit, A↔B peer handshake/message/ack evidence, A↔B↔C relay evidence, beacon/SOS safety flow verified, all still within the same APK, and no false live-data/sending claims.
