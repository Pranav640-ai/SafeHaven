# SafeHaven web integration — 2026-10-10

Continue on `ui`. Mesh radio/device verification is deliberately deferred. The app remains one React frontend, one FastAPI backend, and one Capacitor Android package.

## Implemented

- Destination lookup and 16-day daily weather forecasts from Open-Meteo, with provider retrieval timestamps, attribution, timezone and explicit unknown states outside the forecast horizon.
- GDACS reports within 250 km of a destination's coordinates. These are event-centre matches, not hazard-zone intersection or local authority evacuation instructions. Historical reports are separated from recent monitoring reports. No reports is not a safety assessment.
- Optional GNews search with publication time, source links and unverified labels. News is a keyword match, not authoritative confirmation.
- Editable, locally persistent itineraries. Forecast rules flag rainfall ≥20 mm/day, temperature ≥35°C, wind ≥40 km/h or thunderstorm codes for outdoor/water activities. These thresholds are hackathon planning heuristics, not official warnings. Fixed bookings and unaffected activities retain their original dates/content.
- Optional server-side Gemini wording for affected activities. Without a key, transparent rule-based alternatives still work. Users can compare, edit, accept or reject proposals.
- General Ready.gov source-linked guidance for floods, heat and earthquakes. Prepared Hindi/Tamil translations work without a key; Gemini translates French/Spanish and fetched report metadata; AI translations retain English for comparison and are explicitly unreviewed. Missing/failed translation falls back to English, not invented translated content. This is general guidance, not a translated current local official bulletin.
- Local safety packs with contacts, hotel details, itinerary, saved weather/report snapshots and guidance. Browser data persists across reloads, but can be removed by the browser/user; content has timestamps and does not become live merely by saving it.
- Production PWA manifest, app-shell precache and explicit update/reload button. Saved information reopens offline; API requests and private group responses are not service-worker cached. Remote photos/fonts may be unavailable offline; system font and surface fallbacks remain.
- Private invite-based groups with hashed membership tokens, SQLite persistence, explicit name/status sharing consent, no GPS sharing, timestamped status, latest-event conflict handling, consented queue synchronization on connectivity return, manual retry/cancellation and leaving/removing shared membership. Group tokens are held on the device; this is a hackathon capability-based access design, not full account authentication or encrypted messaging.

## Run locally (Windows)

Use Python 3.12+ and Node 22+:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm install
npm run api
```

In a second terminal:

```powershell
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`. Open the frontend's URL. `GET /api/health` reports which optional providers are configured; `GET /docs` on port 8000 documents the API.

## Optional provider credentials

Copy `backend/.env.example` to `backend/.env`, then set `GEMINI_API_KEY` and optionally `GNEWS_API_KEY` there. Restart the API. Keep those files private; do not put keys in `VITE_*` variables or send them in chat. `GEMINI_MODEL` is configurable. Free-provider quotas and coverage apply.

For separate API hosting or the Android package, set the frontend's **public** `VITE_API_BASE_URL` to the API's HTTPS origin before building. Leave it empty for same-origin hosting. Never use `localhost` as a remote phone's API URL. CORS must include the actual frontend origin and the Capacitor app origin (`https://localhost` by default).

## Deployment

`Dockerfile` builds the PWA and serves it with FastAPI on one origin. `railway.json` configures a health check and the container startup. On Railway, deploy the `ui` branch, attach a volume mounted at `/data`, and keep `DATABASE_PATH=/data/safehaven.db`. Without the volume, group data can disappear on redeploy. Use a single service replica with SQLite; use PostgreSQL before scaling to multiple replicas. Add optional provider keys as private service variables.

If using Vercel for the frontend, `vercel.json` builds `dist`. Set `VITE_API_BASE_URL` to the Railway HTTPS origin, and add the Vercel origin to backend `CORS_ORIGINS`. The frontend calls the API directly; Vercel does not run this Python backend. Rebuild after changing frontend environment variables.

Hosting account access is required to create a live deployment; source configuration alone is not a published website. No hosting secrets are committed.

## Verification

```powershell
npm run build
.\.venv\Scripts\python.exe -m pytest backend/test_app.py -q
```

Backend tests cover group authorization/consent/deletion, stale-event rejection, booking preservation, unknown forecast dates, historical/proximity filtering and honest translation fallback. Live public-provider smoke checks test real Open-Meteo lookup/forecast and GDACS availability. Frontend/browser verification must include itinerary edit/reload, guidance preparation, private check-in sync, mobile widths, and production offline reload.

Gemini/GNews live execution needs keys. Physical Android APK and Nearby tests remain pending. A complete local hazard map, local official bulletin coverage, hazard-aware routing and automatic rescue dispatch are not supplied by these integrations.

## Demo sequence

1. Enter as guest and open Risk intelligence. Search a destination, choose a matching result and travel date, then inspect Weather and Reports. Read provider limitations and save the briefing.
2. Add real trip activities in Trip replanner. Review forecasts, compare proposals, edit and accept/reject them. Keep activities outside forecast coverage marked unknown.
3. Open Emergency guide, choose a language, inspect the linked source and translation status, and save it. Without a Gemini key, English remains available.
4. Open Safety pack, save contacts/hotel details and prepare guidance. Create a private group and join from another browser using the invite. Consent, queue a status, synchronize it, refresh on the companion and then leave if desired.
5. Visit the production app while online, wait for shell caching, disconnect internet, reload and reopen saved packs. No live update is expected while offline.

### Observed results

On 2026-10-10, the production build/PWA generation, 9 backend tests and 7 browser tests passed. Live provider smoke checks returned 8 Manali place matches, 16 forecast days and a successfully retrieved GDACS feed (0 nearby matches for that destination). Later on 2026-10-10, a live structured Gemini request and French guidance translation passed after configuring system-trusted TLS. The current debug Android APK also compiled successfully. GNews, hosted deployment, Docker runtime and physical mesh verification remain pending.

## Android emulator preview

Run `npm run api` and `npm run dev` in separate terminals. Then run `npm run android:emulator` and press Run on the chosen emulator in Android Studio. This opt-in command uses `http://10.0.2.2:5173` to load the current frontend from the host; Vite proxies API requests to port 8000. Use Vite port 5173 for this preview. Before release packaging, run `npm run android:sync` normally to restore bundled assets and remove the local preview URL.

Language controls are in Emergency guide → Preferred language, also reachable through Profile → Language. Guidance supports prepared English/Hindi/Tamil; French/Spanish and report translation need the server Gemini key. App navigation labels are currently English.
