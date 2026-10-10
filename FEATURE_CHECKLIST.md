# Proposed-feature completion checklist

Checked means the stated V1 capability exists in code and has the evidence recorded in FEATURE_AUDIT.md/FINAL_HANDOFF.md. Unchecked means the full proposed requirement is partial, externally dependent or still unverified. Do not interpret this as all features being production complete.

## Five core implementations

- [x] Destination search/date/weather/incident briefing and source labels implemented. Remaining: maintained local official coverage and GNews configuration.
- [x] Editable dated itinerary, proposal comparison/reasons/approval and fixed-booking preservation implemented. Remaining: live AI/provider acceptance and verified venue/destination alternatives.
- [x] Source-linked guidance, language comparison, phrases and read-aloud implemented. Remaining: qualified translation/local-content review and native speech acceptance.
- [x] Nearby Mesh chat/SOS/check-in/beacon/relay code and encrypted 24-hour queues implemented. Help mode needs no code comparison. Remaining: physical connectivity/ACK/queue/compass/relay proof; no background service.
- [x] Offline saved pack and consented private groups implemented. Remaining: offline street maps and production/native acceptance.

## All 25 proposed additions - checked individually

1. [ ] Smart geo alerts: selected-place/polygon alerts and opt-in push exist; background/geofence/provider delivery acceptance remains.
2. [ ] Live hazard map: real tiles/layers exist; comprehensive official zones/closure/shelter feeds remain.
3. [x] Verification labels: sources, timestamps, expiry, community trust and publisher signature state are explicit.
4. [ ] Personalized next actions: hazard guidance and itinerary/preferences exist; validated local/personal risk coverage remains.
5. [x] Time-to-impact honesty: Unknown unless a source supplies a value; no fabricated arrival time.
6. [ ] Hazard-aware routes: candidate routes checked against loaded polygons; complete verified closure routing remains.
7. [ ] Road-photo assessment: consented Gemini path exists; real provider/device acceptance remains, no safe-road prediction.
8. [x] Community reports: public consent, unverified state, expiry, owner deletion and operator review implemented/tested.
9. [ ] Nearest shelters: directory/distance UI exists; maintained real entries and access/capacity confirmation remain.
10. [x] What-if scenario: private isolated simulator and real API check; actual notifications sent stays zero.
11. [ ] Itinerary alerts: dated weather/polygon review exists; live monitoring/complete official feed acceptance remains.
12. [ ] Critical phrase translations: offline bank/English comparison exists; qualified translation review remains.
13. [ ] Voice: browser/native offline TTS code exists; installed-voice/device acceptance remains; no Mesh voice messages.
14. [x] Emergency mode: distinct SOS and focused guidance implemented; no automatic dispatch claim.
15. [ ] Check-ins: consented online groups tested; nearby physical receipt acceptance remains.
16. [x] Private groups: invite/capability ownership, status sync and leave/removal implemented/tested. Production accounts remain separate work.
17. [ ] Offline essentials: saved pack/app/guidance work; licensed offline street maps remain.
18. [ ] Embassy/nationality help: lookup code exists; maintained reviewed contact directory remains.
19. [x] PWA implementation: manifest, icons, caching/update flow and offline reload verified. HTTPS install/upgrade field acceptance remains.
20. [ ] Notifications: in-app/web-push queue/worker/receipt code exists; real provider acceptance, native FCM and SMS remain.
21. [x] Signed alert implementation: Ed25519 publisher signing, pinned validation and expiry exist. Official issuer onboarding/rotation remain.
22. [x] Response dashboard implementation: protected reports/review/publishing/metrics and private-data separation exist. Production identity/roles remain.
23. [ ] Pictograms/accessibility: SVG system/labels/targets/reduced motion exist; full accessibility and localized usability audit remains.
24. [ ] Grounded multilingual assistant: bounded source questions exist; full multilingual assistant/qualified coverage remains.
25. [ ] Metrics: simulator/report/push counters exist; real field delivery/reach/response impact study remains.

## Release gates - still open

- [ ] Deploy persistent HTTPS API and configure/rebuild online Android API origin.
- [ ] Teammate Google sign-in plus server token validation/operator roles.
- [ ] Physical two/three-phone Mesh delivery and abuse/trust acceptance.
- [ ] Maintained official/directory feeds and reviewed translations.
- [ ] Real AI/photo/push provider acceptance; first-use Android permission denial/approximate-location tests.

The item-by-item technical evidence and exact feature locations are in FEATURE_AUDIT.md. Keep unchecked items unchecked until their stated dependency or acceptance test is actually completed.

Two-phone repair: optional Host/Join point-to-point implementation added alongside the existing automatic cluster network. Physical connectivity and delivery gates above remain unchecked.
