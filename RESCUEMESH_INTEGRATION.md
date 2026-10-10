# Current RescueMesh integration

Canonical ui uses Capacitor 7 and tracked native/android/com/safehaven/rescuemesh sources. Root android is generated/ignored. Older main/android-rescuemesh snippets are historical and must not be merged over this implementation. Read AGENTS.md, NEXT_AGENT_CONTEXT.md, FINAL_HANDOFF.md and MESH_TEST_GUIDE.md.

## Setup

Install Node, Android Studio/SDK, JDK21 and Google Play services on test phones. npm ci; npm run android:init for a fresh clone; npm run android:sync; npm run android:open. scripts/install-rescuemesh.mjs installs the Kotlin classes, Nearby dependency, permissions and activity registrations reproducibly. Rebuild/reinstall after sync. Java25 bundled with this Studio is too new for this Gradle version.

## Modes and consent

Default Nearby help network sends allowUnverified=true on explicit discovery start; onConnectionInitiated auto-accepts only while running. Travellers need not meet/exchange codes first. Names/messages are self-reported and unverified. Known-partner mode passes false and uses matching code approval. Optional code confirmation does not certify someone as a rescuer.

SOS, nearby status and precise GPS beacon sharing retain separate consent. Online private groups remain separate. Stop disconnects and clears local pending queues; destruction preserves encrypted pending queues, but no background service/delivery is promised. Late connection callbacks after Stop are ignored. Pending request names survive until resolution; stale request codes and ended requests are cleaned up.

## Storage and protocol

Nearby P2P_CLUSTER, bounded envelopes/TTL/dedup, best-effort store/carry/forward, peer ACK, expiring beacons and true-heading compass where sensors support it. Android Keystore AES-GCM stores bounded pending/carried SOS and latest queued status for up to 24 hours; chat history stays in memory. Already-relayed copies cannot be retracted. A beacon is unverified and its bearing is not a safe route.

## Permissions / speech

Manifest includes coarse/fine location without a max-SDK limit, Nearby Wi-Fi and Bluetooth permissions, and normal Wi-Fi state permissions. Runtime location alias requests coarse + fine; modern Nearby path requests coarse location too. Beacon GPS is explicit. Native offline TTS uses installed non-network voices; device acceptance remains required.

## Evidence / next steps

Web/Android compile and focused UI checks passed. Emulator bridge, disconnected queue/cancel and Back were proven previously. Pairing/ACK failed with emulator I/O/endpoint errors; some other emulators had launcher ANRs. Auto-help mode has not passed physical delivery acceptance. Test two physical phones, then three-phone relay, queue force-stop/expiry, permission denial, compass/voice, Stop races and abuse/trust controls. Do not use compilation or UI tests as proof of connectivity.

Trust design references: https://developers.google.com/nearby/connections/android/manage-connections . Authentication-token comparison is optional at the API level; Google cautions about unauthenticated connections. Public mode needs application identity/signatures/abuse hardening before production trust claims.
