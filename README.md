# SafeHaven AI — Backend Intelligence & Replanning Engine

SafeHaven AI is an AI-powered travel safety and itinerary replanning engine built for TravelTech. When a traveler's planned activities are threatened by severe weather, official disaster warnings, or authoritative closures, SafeHaven AI evaluates the risk deterministically, discovers genuine nearby alternatives using OpenStreetMap, and replans itineraries minimally and transparently.

---

## 1. Core Architecture & Philosophy

The system is designed around three fundamental questions:
1. **Is a planned travel activity affected by a credible risk?**
2. **Should the traveler keep, modify, delay, or avoid the activity?**
3. **If modification is appropriate, what similar nearby destinations or experiences could replace it with minimal disruption?**

```
                     ┌────────────────────────────────────────────────────────┐
                     │                 FastAPI REST Interface                 │
                     │  /api/health  /api/risk  /api/alerts  /api/destinations│
                     │           /api/trips     /api/guidance                 │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
            ┌────────────────────────────────────┼────────────────────────────────────┐
            ▼                                    ▼                                    ▼
┌────────────────────────┐          ┌────────────────────────┐          ┌────────────────────────┐
│  Real Data Ingestion   │          │ Deterministic Scoring  │          │ Alternative Discovery  │
│  - Open-Meteo (Hourly) │          │  R = 100*(0.35H+0.25P  │          │  - OSM Overpass POIs   │
│  - GDACS (UN/EC RSS)   │ ───────► │         +0.25T+0.15C)  │ ───────► │  - Hazard Filtering    │
│  - USGS GeoJSON        │          │  - Mandatory Overrides │          │  - S(a)=ws*Sim+wd*Dist │
│  - UN OCHA ReliefWeb   │          │  - Uncertainty Engine  │          │        +wf*Feasibility │
└────────────────────────┘          └────────────────────────┘          └───────────┬────────────┘
                                                                                    │
                                                                                    ▼
                                                                        ┌────────────────────────┐
                                                                        │  AI Trip Replanner     │
                                                                        │  - Structured Output   │
                                                                        │  - Deterministic Guard │
                                                                        │  - Zero Hallucinations │
                                                                        │  - Automated Fallback  │
                                                                        └────────────────────────┘
```

### Safety & Reliability Guarantees
- **Deterministic Risk First**: Hazard evaluation is computed independently of the LLM using mathematical weights and authoritative feeds.
- **Zero Hallucination of Hazards or Places**: The LLM is strictly constrained to selecting candidates discovered in real-time from OpenStreetMap; it is physically impossible for the model to invent phantom destinations or coordinates.
- **Uncertainty Transparency**: Missing forecasts or failing external feeds are never treated as "zero risk"; they are reported with explicit uncertainty levels and confidence scores.
- **Authoritative Overrides**: Evacuation orders and official route closures override numerical scores and immediately mandate cancellation or avoidance.

---

## 2. Repository Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint, middleware & routers
│   ├── config.py                # Pydantic Settings & environment variables
│   ├── api/                     # Typed REST API endpoints
│   │   ├── health.py            # GET /api/health
│   │   ├── risk.py              # POST /api/risk/assess
│   │   ├── alerts.py            # GET /api/alerts
│   │   ├── destinations.py      # GET /api/destinations/nearby
│   │   ├── trips.py             # POST /api/trips/replan & feedback
│   │   └── guidance.py          # POST /api/guidance/explain
│   ├── schemas/                 # Pydantic v2 validation models & enums
│   │   ├── common.py            # Coordinates, SourceStatus, UncertaintyInfo
│   │   ├── itinerary.py         # Activity, Category, Itinerary, Preferences
│   │   ├── alerts.py            # WarningAlert, HazardCategory, Severity
│   │   ├── risk.py              # ActivityRiskAssessment, ScoreBreakdown
│   │   ├── destinations.py      # CandidatePlace, NearbyDestinations
│   │   ├── replanning.py        # RevisedActivityRecord, TripReplan
│   │   └── guidance.py          # ExplainWarningRequest, GuidanceResponse
│   ├── services/                # Isolated domain services
│   │   ├── cache.py             # In-memory TTL cache with freshness metadata
│   │   ├── weather.py           # Open-Meteo hourly forecast evaluation
│   │   ├── warning_sources.py   # GDACS, USGS, ReliefWeb adapters
│   │   ├── incident_search.py   # Haversine distance, temporal overlap engine
│   │   ├── geocoding.py         # OpenStreetMap Nominatim geocoder
│   │   ├── places.py            # OpenStreetMap Overpass POI discovery
│   │   ├── risk_engine.py       # Deterministic R-scoring engine
│   │   ├── alternative_ranker.py# S(a) similarity, proximity, feasibility ranker
│   │   ├── replanner.py         # LLM trip replanner + deterministic fallback
│   │   └── guidance.py          # Multilingual emergency guidance & contacts
│   └── db/
│       ├── repository.py        # In-Memory & Supabase repository implementations
│       └── schema.sql           # Supabase PostgreSQL schema with RLS & indexes
├── tests/
│   ├── unit/                    # Unit tests for domain services
│   │   ├── test_health.py
│   │   ├── test_weather.py
│   │   ├── test_warning_sources.py
│   │   ├── test_risk_engine.py
│   │   ├── test_alternatives.py
│   │   └── test_replanner.py
│   └── integration/             # End-to-end API route tests
│       └── test_api_endpoints.py
├── .env.example                 # Configuration blueprint
├── .env                         # Local runtime configuration
├── pytest.ini                   # Pytest configuration
├── requirements.txt             # Locked dependencies
└── README.md                    # Documentation
```

---

## 3. Prerequisites

- Python 3.12+ (tested on Python 3.13)
- Windows PowerShell or Unix/macOS Terminal
- Optional: OpenAI or OpenAI-compatible API key (e.g. Gemini, Groq, Ollama) for LLM replanning (the engine operates in verified deterministic mode if omitted).
- Optional: Supabase project for PostgreSQL persistence (in-memory mode is active by default).

---

## 4. Setup & Installation

### Windows PowerShell

1. Clone or navigate to the backend directory:
   ```powershell
   cd C:\Users\raman\.gemini\antigravity\scratch\safehaven\backend
   ```

2. Create virtual environment:
   ```powershell
   py -3.13 -m venv venv
   ```

3. Activate virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

4. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

5. Setup environment file:
   ```powershell
   Copy-Item .env.example .env
   ```

### Unix / macOS Equivalent

```bash
cd safehaven/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

---

## 5. Configuration (.env)

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Application environment (`development` / `production`) | `development` |
| `API_HOST` | Host IP address | `0.0.0.0` |
| `API_PORT` | HTTP port | `8000` |
| `CORS_ORIGINS` | Allowed CORS origins for frontend integration | `http://localhost:5173,http://localhost:3000` |
| `LLM_API_KEY` | API Key for LLM replanning (OpenAI, Gemini, etc.) | Optional |
| `LLM_MODEL` | LLM model identifier | `gpt-4o-mini` |
| `LLM_BASE_URL` | Optional custom base URL for local/alternative models | `None` |
| `SUPABASE_URL` | Supabase project URL | Optional |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | Optional |
| `OPEN_METEO_BASE_URL` | Open-Meteo forecast API | `https://api.open-meteo.com/v1/forecast` |
| `CACHE_TTL_SECONDS` | In-memory default cache TTL | `900` |
| `REQUEST_TIMEOUT_SECONDS`| Network request timeout | `10.0` |

---

## 6. Running the Local Server

Start the FastAPI application with Uvicorn:

```powershell
.\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 7. Running Tests

Run the complete test suite (35 automated tests covering unit, integration, and edge cases):

```powershell
.\venv\Scripts\pytest.exe -v
```

To run a specific test suite:
```powershell
.\venv\Scripts\pytest.exe -v tests/unit/test_risk_engine.py
.\venv\Scripts\pytest.exe -v tests/unit/test_replanner.py
.\venv\Scripts\pytest.exe -v tests/integration/test_api_endpoints.py
```

---

## 8. API Specification & Example Requests

### 1. Health Status
**Endpoint**: `GET /api/health`

Response:
```json
{
  "status": "healthy",
  "service": "SafeHaven AI Backend",
  "version": "1.0.0",
  "environment": "development",
  "dependencies": {
    "weather_service": { "provider": "Open-Meteo", "status": "available" },
    "geocoding_places": { "provider": "OpenStreetMap Nominatim & Overpass", "status": "available" },
    "warning_feeds": { "gdacs": true, "usgs_earthquakes": true, "status": "configured" },
    "persistence": { "mode": "in_memory_fixture" },
    "ai_engine": { "enabled": false, "model": "deterministic_fallback_only" }
  }
}
```

---

### 2. Assess Travel Risk
**Endpoint**: `POST /api/risk/assess`

Request:
```json
{
  "itinerary_id": "itin_goa_01",
  "destination_name": "Goa, India",
  "destination_coordinates": { "latitude": 15.2993, "longitude": 74.1240 },
  "start_date": "2026-10-10",
  "end_date": "2026-10-12",
  "activities": [
    {
      "id": "act_trek",
      "title": "Dudhsagar Waterfall Trek",
      "category": "outdoor_hiking",
      "location_name": "Dudhsagar Falls",
      "coordinates": { "latitude": 15.3144, "longitude": 74.3144 },
      "start_time": "2026-10-10T09:00:00Z",
      "end_time": "2026-10-10T14:00:00Z",
      "is_fixed": false
    }
  ]
}
```

Response:
```json
{
  "itinerary_id": "itin_goa_01",
  "summary": {
    "total_activities": 1,
    "activities_at_risk": 1,
    "highest_risk_category": "caution",
    "overall_recommendation": "delay",
    "activity_assessments": [
      {
        "activity_id": "act_trek",
        "risk_score": 42.5,
        "risk_category": "caution",
        "recommendation": "delay",
        "recommended_action": "Adverse weather forecast. Consider delaying schedule or selecting indoor options.",
        "components": {
          "hazard_severity": 0.5,
          "geographic_relevance": 1.0,
          "temporal_overlap": 1.0,
          "confidence": 0.85,
          "calculated_score": 42.5
        },
        "mandatory_overrides": [],
        "replanning_needed": true
      }
    ]
  }
}
```

---

### 3. Discover Nearby Alternatives
**Endpoint**: `GET /api/destinations/nearby?latitude=15.2993&longitude=74.1240&category=outdoor_hiking&radius_km=15&prefer_indoor=true`

Response:
```json
{
  "origin_coordinates": { "latitude": 15.2993, "longitude": 74.1240 },
  "search_radius_km": 15.0,
  "total_candidates_found": 3,
  "candidates": [
    {
      "id": "osm_54321",
      "name": "State Botanical Greenhouse & Gallery",
      "category": "indoor_museum",
      "distance_km": 4.2,
      "similarity_score": 0.80,
      "distance_score": 0.72,
      "composite_score": 0.76,
      "ranking_explanation": "Ranked #1: Experience similarity 80% (indoor_museum), 4.2 km from original, sheltered from weather.",
      "information_gaps": ["Opening hours not cataloged in OpenStreetMap"]
    }
  ]
}
```

---

### 4. Replan Itinerary
**Endpoint**: `POST /api/trips/replan`

Request:
```json
{
  "itinerary": {
    "destination_name": "Goa, India",
    "destination_coordinates": { "latitude": 15.2993, "longitude": 74.1240 },
    "start_date": "2026-10-10",
    "end_date": "2026-10-12",
    "activities": [
      {
        "id": "act_trek",
        "title": "Dudhsagar Waterfall Trek",
        "category": "outdoor_hiking",
        "location_name": "Dudhsagar Falls",
        "coordinates": { "latitude": 15.3144, "longitude": 74.3144 },
        "start_time": "2026-10-10T09:00:00Z",
        "end_time": "2026-10-10T14:00:00Z"
      }
    ]
  },
  "force_deterministic": true
}
```

Response:
```json
{
  "replanner_mode": "deterministic_rule_engine",
  "validation_status": "validated_ok",
  "changed_activities": [
    {
      "original_activity_id": "act_trek",
      "change_type": "modified",
      "selected_candidate_id": "osm_54321",
      "revised_activity": {
        "id": "act_trek_alt_osm_54321",
        "title": "State Botanical Greenhouse & Gallery (Alternative for Dudhsagar Waterfall Trek)",
        "category": "indoor_museum",
        "location_name": "State Botanical Greenhouse & Gallery",
        "coordinates": { "latitude": 15.3210, "longitude": 74.2980 },
        "start_time": "2026-10-10T09:00:00Z",
        "end_time": "2026-10-10T14:00:00Z"
      },
      "reason_for_change": "Adverse weather forecast at original location.",
      "distance_from_original_km": 4.2
    }
  ]
}
```

---

### 5. Multilingual Emergency Guidance
**Endpoint**: `POST /api/guidance/explain`

Request:
```json
{
  "raw_warning_text": "Coastal flash flood warning in effect until 18:00 UTC. Road closures on coastal highway.",
  "source_org": "State Emergency Management",
  "target_language": "es"
}
```

Response:
```json
{
  "original_warning": "Coastal flash flood warning in effect until 18:00 UTC...",
  "source_organization": "State Emergency Management",
  "target_language": "es",
  "simplified_explanation": "Aviso oficial de inundación repentina...",
  "recommended_actions": [
    "Evitar zonas bajas costeras y carreteras inundadas.",
    "Seguir las instrucciones del personal de emergencia."
  ],
  "emergency_contacts": [
    "International Emergency Standard (GSM): 112"
  ],
  "remaining_uncertainty": "Conditions may evolve rapidly; verify real-time status with issuing agency."
}
```

---

## 9. Data Sources & Limitations

1. **Open-Meteo Weather API**:
   - Free, no API key required.
   - Forecast horizon: Maximum 16 days. Dates beyond 16 days cannot return deterministic hourly forecasts and are flagged with high uncertainty.
2. **GDACS (Global Disaster Alert & Coordination System)**:
   - Live UN/EC RSS disaster coordination alerts for earthquakes, tropical storms, floods, and wildfires.
3. **USGS Earthquake Hazards Feed**:
   - Real-time GeoJSON API for global seismic events.
4. **ReliefWeb (UN OCHA)**:
   - Humanitarian crisis and natural disaster situation reports.
5. **OpenStreetMap (Overpass & Nominatim)**:
   - Community-maintained points of interest and geocoding.
   - Usage compliance: Custom User-Agent header and client caching applied.
   - Information Gaps: Opening hours or wheelchair accessibility are flagged as unverified when omitted from OpenStreetMap tags.

---

## 10. Frontend Integration Instructions

The backend is configured to accept CORS requests from `http://localhost:5173` (Vite / React default) and `http://localhost:3000`.

To integrate from React, Next.js, or mobile clients:

1. **API Base URL**: `http://localhost:8000/api`
2. **Step-by-Step Flow**:
   - Call `POST /api/risk/assess` on itinerary create or view to display risk badges (`low`, `caution`, `high_concern`, `very_high_concern`).
   - If `replanning_needed === true`, display the **"Find Safe Alternatives"** or **"Auto-Replan Itinerary"** button.
   - Call `POST /api/trips/replan` to obtain the revised schedule and alternative comparison cards.
   - Display `changed_activities` highlighting `reason_for_change`, `distance_from_original_km`, and `ranking_explanation`.
   - Submit user acceptance via `POST /api/trips/{id}/feedback`.
   - Call `POST /api/guidance/explain` for emergency warning cards with target language pills (e.g. `es`, `fr`, `hi`, `zh`).
