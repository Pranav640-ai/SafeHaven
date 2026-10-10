# SafeHaven feature audit — 10 October 2026

Read with FINAL_HANDOFF.md. Implemented means code exists, not proof of production readiness. No official coverage, rescue dispatch or safe route guarantee is implied. Both pasted feature lists are covered below.

## Five core features

| Requirement | Present implementation | Remaining acceptance/dependency |
|---|---|---|
| Destination intelligence | Search, real Open-Meteo dated weather, GDACS incident references, optional GNews categories, source/time/trust labels; Map and area bulletins | GNews key; maintained local official warnings and road/shelter feeds. GDACS distance is not an affected-area boundary. |
| Minimal disruption replanning | Dated activities, fixed bookings, preferences, forecast/polygon signals, proposal date/activity changes, compare/edit/accept/reject | Real provider acceptance with Gemini, alternate destinations/venues and verified closure routing; shared trip model. |
| Multilingual guidance | Source-linked general guidance, English comparison, prepared Hindi/Tamil, AI French/Spanish where configured; phrases and listening | Qualified translation review, local authority coverage, native offline voice acceptance. Generated translations remain labelled unreviewed. |
| Nearby Mesh | Android Nearby pairing, chat/SOS/check-ins, ACK, encrypted bounded 24-hour pending/carried queues, relay TTL, GPS beacons/capacity/expiry/compass | Latest device result in handoff; physical 2/3-phone relay, force-stop/reopen, range, sensor and permission acceptance; no background delivery guarantee. |
| Offline pack/check-ins | Cached app, local contacts/itinerary/briefing/guidance/phrases; consented online private groups and separate Nearby status | No downloadable offline street maps; native persistence/expiry acceptance and online production configuration. |

## All 25 broader features

| # | Feature | Status and location / gap |
|---|---|---|
| 1 | Geo-specific alerts | Risk overview, Map, dated itinerary; published polygons and opt-in selected-place web push. No continuous GPS geofencing/background monitor. |
| 2 | Live hazard map | Risk → Map: real map tiles, incident points, community observations, published zones, directory shelters, candidate roads. Coverage depends on loaded data; no comprehensive live closures. |
| 3 | Verification labels | Explicit source, timestamp, expiry, unverified community status, corroborating source, cryptographic publisher validation. A signature is not authority verification. |
| 4 | Personalized next actions | Guidance by hazard, itinerary/preferences and source-based proposal reasoning. Not a medically/local-authority validated personal risk engine. |
| 5 | Time to impact | Unknown unless supplied by a source bulletin. No invented arrival time. |
| 6 | Hazard-aware route options | Map: OSRM alternatives checked against loaded warning/critical/closure polygons. No independent safe-route guarantee or complete hazard graph. |
| 7 | Road photo assessment | Map: explicit consent, resized/EXIF-stripped image, Gemini visible observations and uncertainty. Needs provider/device acceptance; not flood-depth or safe-road prediction. |
| 8 | Community reports | Map: voluntary selected coordinates, consent, unverified label, expiry, owner deletion; private operator review. |
| 9 | Nearest shelters | Map: source-checked owner directory, distance and expiry. Directory currently needs maintained real entries; proximity does not certify access/safety. |
| 10 | What-if scenarios | Private /response isolated area/route/severity/check-in simulator; no live writes or notifications. CLI scenario tool also present. |
| 11 | Itinerary alerts | Trip replanner: weather and date-matched loaded area warnings; fixed bookings preserved. No automatic background trip monitoring. |
| 12 | Critical phrase translation | Safety pack → phrases, English comparison and language selection. Review by qualified native speakers remains. |
| 13 | Voice | Guidance read-aloud in supported browsers; native installed offline TTS voices. Not live voice calls or voice-message Mesh. |
| 14 | One-step emergency mode | SOS distinct route, emergency guidance step focus, contacts and consented nearby SOS. No automatic emergency dispatch. |
| 15 | Consented check-in | Home quick check-in → Safety pack private group; Mesh → Nearby separately. No silently shared GPS. |
| 16 | Private groups | Invite/member capability tokens, status updates/queued retry, leave/removal. Production account-linked access and abuse controls remain. |
| 17 | Offline essentials | Cached UI, guidance, phrase bank, contacts, itinerary and saved briefings. Offline basemap requires a licensed provider; OSM tile bulk downloading is not implemented. |
| 18 | Nationality/embassy help | Safety pack directory lookup. Must supply/maintain source-checked nationality/contact entries; no fictional contacts. |
| 19 | Installable PWA | Manifest, existing-symbol PNG icons, app caching and update handling. HTTPS deployment and actual install/upgrade acceptance remain. |
| 20 | Notifications | In-app notices and consented browser web push queue/worker/receipt accounting. Real browser push delivery test remains; native FCM and SMS are not implemented. |
| 21 | Signed alerts | Ed25519 publisher signing and pinned-key validation; expired/untrusted instructions suppressed. Managed issuer onboarding/key rotation and official feed ingestion remain. |
| 22 | Response dashboard | Private /response token-protected reports/review/publish/metrics; excludes private group membership/status. Production roles/authentication and operator workflow remain. |
| 23 | Pictograms/accessibility | Existing icons preserved, visible labels, separated mobile targets, focus/reduced motion. Screen-reader/contrast/local-language usability audit remains. |
| 24 | Grounded assistant | Guidance → source questions: bounded answers from selected general guidance with provenance. Not a broad multilingual conversational disaster assistant. |
| 25 | Scenario metrics | Isolated simulator counts; response report lifecycle and web-push provider/receipt metrics. Receipt is not human reading or rescue outcome; field impact study remains. |

## Highest priority next work

1. Production HTTPS API and Android API origin; Google authentication and real role enforcement.
2. Physical Mesh acceptance, persistence and three-phone relay; background service decision.
3. Maintained official advisory/closure/shelter/consular data; reviewed translations.
4. Shared trip/navigation model and usability testing; real AI and push provider acceptance.
5. Licensed offline maps, native notifications/SMS only with consent and a defined provider.
