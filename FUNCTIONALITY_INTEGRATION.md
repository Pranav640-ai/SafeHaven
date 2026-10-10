# Functional branch integration

Imported selected risk/weather/warning/nearby-place modules from origin/feature/backend at 5c949f0 into backend/intelligence. Existing backend/app.py APIs stay compatible. No frontend, icons, native Mesh or Google-auth files were replaced.

## Added to the current user flow

- Risk → choose destination/date → Overview → Activity risk details. Outdoor/indoor/water checks use a 06:00–18:00 local planning window, hourly Open-Meteo, source evidence and provider coverage/uncertainty. Scores are prototype heuristics, not calibrated hazard probabilities or travel clearance.
- Nearby GDACS/USGS reported events include publication time, source link and distance to event centre; no claim that the destination is affected. USGS occurrences are historical/event reports, not evacuation orders.
- Trip replanner → Find nearby alternatives → Find nearby places. Real OSM candidates are ranked for proximity/similarity, with opening/accessibility/pricing information gaps. Use as activity draft fills the editor only; saved bookings and Original/Proposed approval flow remain intact.
- Existing destination search, reports/GNews, Gemini explanations/replanning, signed area warnings, saved pack and community APIs remain active. Offline Mesh is independent of these APIs.

New compatibility routes: POST /api/intelligence/risk/assess with {place,date,kind}; GET /api/intelligence/destinations/nearby with latitude/longitude/prefer_indoor. The new Python namespace prevents collision with the current backend. Windows gets tzdata for destination timezones.

## Corrections to the upstream code

Strong earthquakes/GDACS severity are not mandatory evacuation/closure instructions. Unknown report validity is not replaced with an invented five/seven/two-day warning. Missing evidence produces no safety conclusion instead of numeric low-risk clearance. Forecasts are labelled forecast; calibrated confidence is not claimed. Empty local-provider placeholders and unconfigured ReliefWeb are skipped, not successful official feeds. Report proximity does not become a verified hazard polygon for alternative filtering. Cached timestamps preserve age; provider failures do not leak raw request details to clients. No fabricated venues are inserted on provider failure. These differences are intentional.

## Configuration and remaining work

Open-Meteo, GDACS and USGS use public defaults (override their *_URL variables in backend/.env when needed). OSM uses OVERPASS_BASE_URL and GEOCODING_USER_AGENT. ReliefWeb is optional: configure RELIEFWEB_API_URL and RELIEFWEB_APPNAME; local authority adapters need maintained sources. Existing current signed area warnings are separate, preserved functionality.

This selectively adapts the functional modules; it does not deploy the alternate OpenAI/Supabase stack from that branch. Current Gemini replanning and local saved-plan approval remain canonical. Exact per-activity clock times, maintained local closures, reviewed/calibrated risk modelling, comprehensive hazard geometry and verified venue access need future work. Existing UI only records an activity date; the explicit daily window avoids pretending to know a booked start time.

Online risk/alternatives require the running backend. Start npm run api for the website; a physical APK needs a deployed HTTPS VITE_API_BASE_URL and rebuild (see FINAL_HANDOFF.md). An APK cannot run the Python API itself. No background or guaranteed disaster-safety claim is made.

Validation: 26 backend checks passed (existing API/safety plus first five integration checks); all seven focused intelligence checks passed after final provider corrections. Two focused browser checks passed for missing-source honesty and candidate draft selection retaining an existing booking. Web/Android build passed; live source calls returned Open-Meteo, GDACS and USGS data. Physical Google account/Mesh acceptance remains separate.
