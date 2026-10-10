import pytest
from datetime import datetime, timezone, timedelta, date
from unittest.mock import patch, MagicMock

from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from app.schemas.common import Coordinates, SourceStatus
from app.schemas.destinations import CandidatePlace
from app.schemas.itinerary import ActivityCategory


@pytest.fixture
def sample_payload():
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    today = now.date()

    return {
        "itinerary_id": "itin_api_1",
        "destination_name": "Goa Beach & Heritage",
        "destination_coordinates": {"latitude": 15.2993, "longitude": 74.1240},
        "start_date": today.isoformat(),
        "end_date": (today + timedelta(days=2)).isoformat(),
        "activities": [
            {
                "id": "act_beach",
                "title": "Baga Beach Sunset Walk",
                "category": "outdoor_beach",
                "location_name": "Baga Beach",
                "coordinates": {"latitude": 15.5553, "longitude": 73.7517},
                "start_time": (now + timedelta(hours=2)).isoformat(),
                "end_time": (now + timedelta(hours=4)).isoformat(),
                "is_fixed": False,
            },
            {
                "id": "act_museum",
                "title": "Goa State Museum Tour",
                "category": "indoor_museum",
                "location_name": "Panaji Museum",
                "coordinates": {"latitude": 15.4989, "longitude": 73.8278},
                "start_time": (now + timedelta(hours=5)).isoformat(),
                "end_time": (now + timedelta(hours=7)).isoformat(),
                "is_fixed": True,
            },
        ],
        "user_preferences": {
            "accessibility_required": False,
            "max_alternative_distance_km": 25.0,
            "prefer_indoor_on_weather_risk": True,
        },
    }


@pytest.mark.asyncio
async def test_api_risk_assess_endpoint(async_client, sample_payload):
    with patch("app.services.weather.weather_service.fetch_forecast") as mock_weather, \
         patch("app.services.warning_sources.warning_aggregator.fetch_all_warnings") as mock_warn:

        mock_weather.return_value = (None, SourceStatus(source_name="Open-Meteo", status="ok"))
        mock_warn.return_value = ([], [])

        response = await async_client.post("/api/risk/assess", json=sample_payload)
        assert response.status_code == 200
        data = response.json()

        assert "summary" in data
        assert data["summary"]["total_activities"] == 2
        assert data["summary"]["highest_risk_category"] == "low"
        assert len(data["summary"]["activity_assessments"]) == 2
        assert "correlation_id" in response.headers or "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_api_risk_assess_validation_error(async_client):
    # Invalid end_date before start_date
    invalid_payload = {
        "destination_name": "Invalid Trip",
        "destination_coordinates": {"latitude": 15.0, "longitude": 74.0},
        "start_date": "2026-10-15",
        "end_date": "2026-10-10",  # Invalid!
        "activities": [],
    }
    response = await async_client.post("/api/risk/assess", json=invalid_payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_alerts_endpoint(async_client):
    now = datetime.now(timezone.utc)
    sample_alert = WarningAlert(
        id="alert_test_1",
        source_org="National Disaster Management",
        published_at=now,
        valid_from=now,
        valid_until=now + timedelta(days=1),
        hazard_category=HazardCategory.SEVERE_WEATHER,
        severity=HazardSeverity.SEVERE,
        title="Cyclone Alert",
        original_text="Severe cyclonic storm approaching coastline.",
        geographic_coverage="Coast Zone",
        coordinates=Coordinates(latitude=15.5, longitude=73.8),
        radius_km=30.0,
        verification_status=VerificationStatus.OFFICIAL,
    )

    with patch("app.services.warning_sources.warning_aggregator.fetch_all_warnings") as mock_warn:
        mock_warn.return_value = ([sample_alert], [])

        # Fetch all alerts
        res = await async_client.get("/api/alerts?page=1&page_size=10")
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == "alert_test_1"
        assert data["pagination"]["total"] == 1

        # Test filtering by category
        res_cat = await async_client.get("/api/alerts?category=severe_weather")
        assert res_cat.status_code == 200
        assert len(res_cat.json()["items"]) == 1

        res_cat_none = await async_client.get("/api/alerts?category=wildfire")
        assert res_cat_none.status_code == 200
        assert len(res_cat_none.json()["items"]) == 0


@pytest.mark.asyncio
async def test_api_destinations_nearby_endpoint(async_client):
    cand = CandidatePlace(
        id="osm_museum_1",
        name="Maritime Heritage Museum",
        coordinates=Coordinates(latitude=15.5000, longitude=73.8200),
        category=ActivityCategory.INDOOR_MUSEUM,
        distance_km=2.5,
        ranking_explanation="Sheltered cultural attraction",
    )

    with patch("app.services.places.places_service.find_nearby_places") as mock_places, \
         patch("app.services.warning_sources.warning_aggregator.fetch_all_warnings") as mock_warn:

        mock_places.return_value = ([cand], SourceStatus(source_name="OSM", status="ok"))
        mock_warn.return_value = ([], [])

        res = await async_client.get(
            "/api/destinations/nearby?latitude=15.5&longitude=73.8&category=outdoor_beach&radius_km=15&prefer_indoor=true"
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_candidates_found"] >= 1
        assert data["candidates"][0]["name"] == "Maritime Heritage Museum"
        assert data["candidates"][0]["similarity_score"] > 0.0


@pytest.mark.asyncio
async def test_api_trips_replan_endpoint(async_client, sample_payload):
    with patch("app.services.weather.weather_service.fetch_forecast") as mock_weather, \
         patch("app.services.warning_sources.warning_aggregator.fetch_all_warnings") as mock_warn, \
         patch("app.services.places.places_service.find_nearby_places") as mock_places:

        mock_weather.return_value = (None, SourceStatus(source_name="Open-Meteo", status="ok"))
        mock_warn.return_value = ([], [])
        mock_places.return_value = ([], SourceStatus(source_name="OSM", status="ok"))

        replan_req = {
            "itinerary": sample_payload,
            "force_deterministic": True,
        }

        res = await async_client.post("/api/trips/replan", json=replan_req)
        assert res.status_code == 200
        data = res.json()
        assert "original_itinerary" in data
        assert "revised_itinerary" in data
        assert "changed_activities" in data
        assert data["validation_status"] == "validated_ok"


@pytest.mark.asyncio
async def test_api_guidance_explain_endpoint(async_client):
    req_body = {
        "raw_warning_text": "High surf advisory in effect. Dangerous rip currents along beaches. Avoid swimming.",
        "source_org": "National Weather Service",
        "target_language": "es",
    }

    res = await async_client.post("/api/guidance/explain", json=req_body)
    assert res.status_code == 200
    data = res.json()
    assert data["target_language"] == "es"
    assert "High surf advisory" in data["original_warning"]
    assert len(data["recommended_actions"]) >= 1
    assert len(data["emergency_contacts"]) >= 1
    # Check that contact is from authoritative registry (112, 911, etc.)
    assert any("112" in c or "911" in c for c in data["emergency_contacts"])


@pytest.mark.asyncio
async def test_api_trip_feedback_and_retrieval(async_client, sample_payload):
    itin_id = "itin_feedback_test"
    sample_payload["itinerary_id"] = itin_id
    sample_payload["id"] = itin_id

    # Post feedback
    fb_res = await async_client.post(
        f"/api/trips/{itin_id}/feedback",
        json={"accepted": True, "comment": "Great alternative suggestions."},
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["status"] == "ok"
