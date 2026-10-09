# SafeHaven AI

**One mobile-first tourist safety app:** a React/TypeScript website that can also be packaged as **one Android APK** with Capacitor. A Kotlin bridge supplies Android-only offline peer networking. The project is a hackathon prototype, **not a production emergency service**.

**Repository:** https://github.com/Pranav640-ai/SafeHaven

## Start here — consolidated development branch

Use **[ui](https://github.com/Pranav640-ai/SafeHaven/tree/ui)** for all current development. It includes the reviewed interface, Capacitor Android bridge, and the latest Risk/Explore/Login fixes and engineering handoff.

The former `feature/rescuemesh-android-bridge` and `handoff/risk-ui-onboarding-codex` branches are incorporated into `ui`. The `ui-before-*` and `ui-v8-backup-before-rollback` branches are historical design backups. Leave them as references.

`main` retains the original incomplete standalone Kotlin experiments for audit; their corrected implementation is in `native/android/` on `ui`. Do not merge those obsolete sources into the integrated app. Draft PR #1 is the earlier bridge-to-main proposal; it does not define the canonical development branch.

Detailed developer handoff: **[CODEX_HANDOFF.md](CODEX_HANDOFF.md)**. Android-specific testing and warnings: **[RESCUEMESH_INTEGRATION.md](RESCUEMESH_INTEGRATION.md)**.

## Product scope — five core modules

1. **Destination Risk Intelligence:** location/date-aware weather and incident intelligence with sources, timestamps, trust labels and uncertainty. **Presently UI placeholders; live providers are not integrated.**
2. **Minimum-disruption Trip Replanner:** identify affected itinerary stops and recommend justified alternatives with minimal changes. **Presently a sample itinerary and UI logic; Gemini/server integration pending.**
3. **Sourced Multilingual Emergency Guidance:** hazard instructions, official warnings and translations that retain provenance. **Presently general static guidance; authoritative feeds and translation pending.**
4. **Android RescueMesh:** offline Nearby peer discovery, code-confirmed connections, chats, application-managed best-effort relaying and SOS; includes opt-in **Community Safety Beacon** as a subfeature. **Bridge is implemented and builds, but actual radio/device delivery remains unverified.**
5. **Offline Safety Pack / Group Check-in:** cached contacts, itinerary, prior guidance and voluntary group status. **Presently mostly local UI; durable offline storage and synchronization remain pending.**

A Community Safety Beacon is **self-reported/unverified**, optional, temporary and revocable. Local GPS/bearing can provide approximate direction, **never** a guaranteed safe route. No location is shared by default. SOS must not imply actual delivery without an acknowledgement.

## Technology

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4 + app CSS, Motion for React, Lucide React, React Loading Skeleton; native horizontal scrolling in the UI.
- **Android:** Capacitor 7; Kotlin Capacitor plugin in `native/android/`; Google Nearby Connections (`com.google.android.gms:play-services-nearby:19.3.0`), plus Capacitor Geolocation when a user chooses to broadcast coordinates.
- **Planned backend (NOT committed):** Python/FastAPI (Railway), Google Gemini server-side, Open-Meteo, official government safety sources, news search APIs, optional Supabase/PostgreSQL, Leaflet/OpenStreetMap; frontend hosting on Vercel.
- **Development:** GitHub, Node.js 22+, VS Code, Android Studio with JDK 21, at least two physical Android devices (three for relay).

Do **not** embed Gemini/news API secrets in Vite environment variables exposed to the browser or Android APK.

## Run the frontend

```bash
git clone -b ui https://github.com/Pranav640-ai/SafeHaven.git
cd SafeHaven
npm install
npm run dev
```

Visit the Vite address (normally `http://localhost:5173`). In Chrome, use F12 → Ctrl+Shift+M to emulate a phone. Real mobile browsers can reach the Vite Network URL while on the same Wi-Fi, subject to firewall restrictions.

```bash
npm run build
npm run preview
```

The login/phone-number UI is **not an OTP authentication service**; guest entry is available. In a browser, RescueMesh must say Android/native hardware is required rather than invent peers or delivered messages.

## Build one Android app

Install Android Studio/SDK, Node.js 22+, JDK 21 and Google Play services on testing phones.

```bash
npm install
npm run android:init
npm run android:open
```

`android:init` runs the frontend build, generates `android/` with Capacitor if absent, syncs assets, installs the Kotlin bridge, registers the plugin and patches the real Android Gradle/manifest. The generated `android/` project is intentionally **not** tracked in Git. Reopen Android Studio to build/install a debug APK.

After React/native source edits:

```bash
npm run android:sync
npm run android:open
```

See `RESCUEMESH_INTEGRATION.md` for permissions, pairing approval and detailed tests. Never test real Nearby networking using Chrome device emulation or a web-only deployment.

## Repository map

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Shared mobile interface, navigation, Login, Home, Explore, Risk, Replanner, Emergency Guide, Safety Pack and Profile |
| `src/styles.css` | Unified v7 design system plus narrowly scoped UI fixes (no second override stylesheet) |
| `src/mesh/RescueMeshScreen.tsx`, `src/mesh/mesh.css` | Tabs/screens for Chats, Nearby, Beacons and SOS |
| `src/mesh/useRescueMesh.ts` | Typed React hook and Capacitor bridge/events, with browser guard |
| `native/android/com/safehaven/rescuemesh/` | Corrected Kotlin manager, plugin and native message protocol |
| `scripts/init-android.mjs`, `scripts/install-rescuemesh.mjs` | Capacitor bootstrap and Android dependency/permission/plugin installer |
| `capacitor.config.ts` | Single Android app config, application ID `com.safehaven.ai` |
| `RESCUEMESH_INTEGRATION.md` | Hardware permissions, protocol and testing instructions |
| `CODEX_HANDOFF.md` | Exact engineering priorities, acceptance criteria and integration plan |
| `.github/workflows/` | Available CI configurations; inspect actual GitHub Actions results before merging |

The original teammate Kotlin experiments are on **`main/android-rescuemesh/`**, not the buildable plugin source on this branch.

## Current verification and limitations

**Consolidation checks (2026-10-10):** `npm run build` passed locally, and both native setup scripts passed Node syntax checks. Android SDK is unavailable locally; the Android workflow now also runs on `ui`. Hardware networking remains unverified.

**Previously reported passing:** integrated frontend Vite/TypeScript CI and an Android debug APK/Gradle build for the RescueMesh integration branch. These demonstrate compilation only; the small UI edits on this handoff branch still need their own `npm run build` verification.

**Not yet established:** a reliable two-phone offline session, packet receipt and acknowledgement, three-phone relay, SOS delivery, reboot persistence, permission-denied behavior and end-to-end Android device compatibility. Nearby connections can fail if permission/radios/Play services are absent, and the network cannot guarantee delivery.

**Known safety limitations:** SOS queue is currently in memory, so process death can lose it; beacon claims are not officially verified; an unverified refuge is not an approved shelter; compass distance/bearing does not establish safe routing. Treat external photos as illustrative, not evidence of current destination conditions.

## Next implementation steps

1. On `ui`, run `npm install && npm run build`; review the three UI adjustments and accessibility in Chrome/real phone.
2. Build and install the Android APK on **two real phones**. Grant OS permissions, compare the displayed six-digit pairing code on both, approve both ends, then prove a chat and a received peer acknowledgement with no internet.
3. Test A↔B↔C relay, duplicate/TTL behavior, queue recovery, SOS acknowledgement and beacon create/update/expiry/withdrawal on three real devices. Fix any native problems before asserting success.
4. Continue development on `ui`. Any later release to `main` requires validated build and physical-device results.
5. Integrate FastAPI, Open-Meteo, official incident sources, Gemini replanning, translation, offline caching and opt-in check-ins; wire to actual UI states.

**AI coding assistants:** read [CODEX_HANDOFF.md](CODEX_HANDOFF.md) before editing. Do not remove consent, provenance or undelivered statuses to make the interface appear complete.
