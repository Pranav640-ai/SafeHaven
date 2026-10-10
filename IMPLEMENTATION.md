# Current implementation guide

Read FINAL_HANDOFF.md for complete setup/hosting/Google sign-in instructions, FEATURE_AUDIT.md and FEATURE_CHECKLIST.md for full scope, and AGENTS.md/UI_CHECKLIST.md for fixed visuals. This replaces the original nine-test/simple-tool implementation snapshot.

## Modules

- App.tsx: guest entry, Home/Explore/Profile, history, fixed SVG cards, shared outline loading and animated separated dock.
- TravelTools.tsx: destination search/date/briefing, Original/Proposed/reasons/approval, source guidance and offline pack/private groups. Legacy Home notes are read as the pack default only when no hotel data was saved.
- LocalConditions.tsx + safety.py: real map tiles, consented expiring community reports/deletion, sourced polygons, candidate route checks, directory shelters and consented image assessment.
- AreaWarnings.tsx: publisher signatures/public pin, expiry/untrusted instruction suppression and saved snapshots.
- EmergencySupport.tsx: source questions, offline phrases, directory contacts and browser/native voice.
- DestinationNotifications.tsx + push.py + push worker: selected-place opt-in, capability revocation, bounded jobs/provider acceptance/device receipts; no native FCM/SMS.
- ResponseDashboard.tsx: private token-protected operator review/publishing/metrics and isolated scenario with no live sends.
- src/mesh + tracked native/android: Nearby mode/peers/messages, explicit sharing, encrypted 24-hour bounded queues, beacon GPS/expiry/compass and native offline TTS.

## Truthful boundaries

Forecast signals are estimates, GDACS event proximity is not an affected-area boundary, routes avoid only loaded polygons, directory entries must be maintained, generated/prepared translations need review, and anonymous Mesh participants are unverified. Guest/capability tokens are not Google authentication. Physical native acceptance remains outstanding; see the latest evidence in final handoff.

## Setup and ownership

npm ci; Python .venv + backend/requirements.lock.txt; backend/.env from example only on first setup; npm run api + npm run dev. Never overwrite existing credentials. Build before cap sync; installer copies tracked native sources into generated ignored android. JDK21 is required. Hosting uses a persistent HTTPS API and public build-time VITE_API_BASE_URL/publisher pin; private keys stay server-side. The current local debug APK does not contain a hosted backend.

Core icons/widgets/fonts are fixed. Only demonstrated duplicates are removed; advanced functions stay within their parent tools. Current frontend strict-unused checks pass. Use affected tests rather than repeatedly running a full suite.
