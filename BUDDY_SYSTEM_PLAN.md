# Online buddies — next phase after physical Mesh verification

User decision: defer buddy implementation until the same APK is installed on two real phones and nearby delivery passes. No buddy chat buttons or pretend online conversations are added yet. Railway backend is https://safehaven-production-9f5d.up.railway.app.

## Intended journey

Sign in with Google → Profile / Buddies → share an invite or find an account → send a request → recipient accepts → open private one-to-one online chat. Show pending invitations, send/received states, retry/offline status, remove/block controls. Sharing location/check-in must be an additional explicit action; adding a buddy does not grant ongoing GPS access. Guest users retain offline Mesh and local trip tools.

## Backend work required

1. Verify Firebase ID tokens server-side using the same safe-havenai project; derive user ID from the verified token, never a client-supplied UID/email. No service-account key in frontend/APK.
2. Persist user profiles, requests, accepted buddy pairs, messages and receipt states in a maintained database (Railway persistent volume with suitable database configuration, or managed Postgres). Existing capability-based private groups are not account-authenticated buddy chat.
3. Add authenticated invite/request/accept/list/remove/block routes and pair-authorized message/read routes. Test unrelated-account access rejection, pending/rejected requests, duplicates, block/remove and token expiry. Do not expose a global searchable email directory.
4. Implement authenticated realtime delivery or bounded polling with cursors and deduplication. Reconnect/history fetch cannot duplicate messages. Only label delivered/read after the recipient's client confirms the relevant state. Rate limits, message limits and retention/deletion are needed.
5. Add focused two-account web/Android tests, then optional native push. Browser push is not Android FCM. Server-held data must not be described as end-to-end encrypted without actually implementing and verifying it.

## Mesh relationship

Online buddy chat requires internet and the deployed authenticated backend. Nearby Mesh chat, SOS, check-ins and beacons run through Bluetooth/Wi-Fi Nearby independently of Railway. Google account identity does not authenticate a nearby display name. Keep separate delivery states and consents; switching transport or forwarding buddy messages to anonymous nearby peers is not automatic. Any future identity binding/fallback requires a separate design and tests.

## First physical acceptance

Follow MESH_TEST_GUIDE.md: one Host, one Join, foreground apps, Bluetooth/Wi-Fi/Location on and required permissions granted. Confirm chat in both directions with peer acknowledgements; SOS receipt/ACK; consented safe/need-help check-in; beacon GPS/expiry/withdrawal. Repeat reconnect and denied/approximate permission handling. Record failures/status codes instead of treating UI rendering or browser bridge mocks as physical delivery. Then proceed with this buddy phase.
