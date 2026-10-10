import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from app.schemas.common import Coordinates
from app.schemas.destinations import CandidatePlace
from app.schemas.itinerary import Activity, ActivityCategory, UserPreferences
from app.services.alternative_ranker import AlternativeRanker
from app.services.places import OSMPlacesService, map_osm_tags_to_category
from app.services.cache import cache


def test_map_osm_tags_to_category():
    assert map_osm_tags_to_category({"tourism": "museum"}) == ActivityCategory.INDOOR_MUSEUM
    assert map_osm_tags_to_category({"historic": "castle"}) == ActivityCategory.CULTURAL_HERITAGE
    assert map_osm_tags_to_category({"leisure": "nature_reserve"}) == ActivityCategory.NATURE_WILDLIFE
    assert map_osm_tags_to_category({"leisure": "track", "hiking": "yes"}) == ActivityCategory.OUTDOOR_HIKING
    assert map_osm_tags_to_category({"natural": "beach"}) == ActivityCategory.OUTDOOR_BEACH


def test_alternative_risk_filtering_hazard_zone():
    ranker = AlternativeRanker()
    now = datetime.now(timezone.utc)

    # Activity: hiking trail
    orig_act = Activity(
        id="act_trail",
        title="Forest Trek",
        category=ActivityCategory.OUTDOOR_HIKING,
        location_name="Pine Ridge",
        coordinates=Coordinates(latitude=45.0, longitude=7.0),
        start_time=now + timedelta(hours=2),
        end_time=now + timedelta(hours=5),
    )

    # Active wildfire 3km from candidate 1
    fire_alert = WarningAlert(
        id="fire_1",
        source_org="State Fire Agency",
        published_at=now,
        hazard_category=HazardCategory.WILDFIRE,
        severity=HazardSeverity.EXTREME,
        title="Wildfire at Ridge",
        original_text="Active wildfire burning in forest.",
        geographic_coverage="Ridge",
        coordinates=Coordinates(latitude=45.02, longitude=7.02),
        radius_km=10.0,
        is_mandatory_override=True,
        verification_status=VerificationStatus.OFFICIAL,
    )

    # Candidate 1: 2 km from wildfire (inside hazard zone)
    cand_risky = CandidatePlace(
        id="cand_1",
        name="Sunny Meadow Trail",
        coordinates=Coordinates(latitude=45.03, longitude=7.03),
        category=ActivityCategory.OUTDOOR_HIKING,
        distance_km=4.0,
        similarity_score=1.0,
        distance_score=0.9,
        feasibility_score=1.0,
        composite_score=0.95,
        ranking_explanation="",
    )

    # Candidate 2: 35 km away, completely outside hazard zone
    cand_safe = CandidatePlace(
        id="cand_2",
        name="Valley Botanical Garden",
        coordinates=Coordinates(latitude=45.30, longitude=7.30),
        category=ActivityCategory.NATURE_WILDLIFE,
        distance_km=15.0,
        similarity_score=0.85,
        distance_score=0.5,
        feasibility_score=1.0,
        composite_score=0.75,
        ranking_explanation="",
    )

    eligible, filtered = ranker.filter_and_rank_alternatives(
        original_activity=orig_act,
        candidates=[cand_risky, cand_safe],
        all_alerts=[fire_alert],
        search_radius_km=25.0,
    )

    assert len(filtered) == 1
    assert filtered[0].id == "cand_1"
    assert filtered[0].is_risk_filtered is True
    assert "hazard zone" in filtered[0].filter_reason.lower()

    assert len(eligible) == 1
    assert eligible[0].id == "cand_2"
    assert eligible[0].is_risk_filtered is False


def test_alternative_similarity_and_ranking_order():
    ranker = AlternativeRanker()
    now = datetime.now(timezone.utc)

    orig_act = Activity(
        id="act_museum",
        title="Art Museum Tour",
        category=ActivityCategory.CULTURAL_HERITAGE,
        location_name="Museum District",
        coordinates=Coordinates(latitude=48.8566, longitude=2.3522),
        start_time=now + timedelta(hours=1),
        end_time=now + timedelta(hours=3),
    )

    # Candidate A: Historic castle (high similarity: 0.90), distance 3 km
    cand_castle = CandidatePlace(
        id="cand_a",
        name="Historic Fortress",
        coordinates=Coordinates(latitude=48.87, longitude=2.36),
        category=ActivityCategory.CULTURAL_HERITAGE,
        distance_km=3.0,
        ranking_explanation="",
    )

    # Candidate B: Outdoor hiking track (low similarity: 0.40), distance 2 km
    cand_hike = CandidatePlace(
        id="cand_b",
        name="Periphery Walking Path",
        coordinates=Coordinates(latitude=48.86, longitude=2.34),
        category=ActivityCategory.OUTDOOR_HIKING,
        distance_km=2.0,
        ranking_explanation="",
    )

    eligible, _ = ranker.filter_and_rank_alternatives(
        original_activity=orig_act,
        candidates=[cand_hike, cand_castle],
        all_alerts=[],
        search_radius_km=20.0,
    )

    assert len(eligible) == 2
    # cand_castle should rank first due to strong similarity to cultural heritage
    assert eligible[0].id == "cand_a"
    assert eligible[0].similarity_score > eligible[1].similarity_score
    assert eligible[0].composite_score > eligible[1].composite_score


def test_alternative_discovery_no_suitable_candidates():
    ranker = AlternativeRanker()
    now = datetime.now(timezone.utc)

    orig_act = Activity(
        id="act_rare",
        title="Special Activity",
        category=ActivityCategory.OUTDOOR_BEACH,
        location_name="Remote Cove",
        coordinates=Coordinates(latitude=20.0, longitude=70.0),
        start_time=now,
        end_time=now + timedelta(hours=2),
    )

    eligible, filtered = ranker.filter_and_rank_alternatives(
        original_activity=orig_act,
        candidates=[],
        all_alerts=[],
    )

    assert len(eligible) == 0
    assert len(filtered) == 0


@pytest.mark.asyncio
async def test_osm_places_service_mock_parser():
    service = OSMPlacesService(overpass_url="http://mock-overpass.local")
    cache.clear("places")

    sample_overpass_resp = {
        "elements": [
            {
                "type": "node",
                "id": 999111,
                "lat": 15.299,
                "lon": 74.124,
                "tags": {
                    "name": "Basilica Museum",
                    "tourism": "museum",
                    "opening_hours": "09:00-17:00",
                },
            },
            {
                "type": "node",
                "id": 999222,
                "lat": 15.310,
                "lon": 74.130,
                "tags": {
                    "name": "Scenic River Viewpoint",
                    "tourism": "viewpoint",
                },
            },
        ]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.json.return_value = sample_overpass_resp
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        candidates, status = await service.find_nearby_places(
            origin=Coordinates(latitude=15.300, longitude=74.120),
            radius_km=10.0,
        )

        assert status.status == "ok"
        assert len(candidates) == 2
        assert candidates[0].name == "Basilica Museum"
        assert candidates[0].category == ActivityCategory.INDOOR_MUSEUM
        assert candidates[0].distance_km < 5.0
        # Check information gaps
        assert any("Accessibility" in gap for gap in candidates[0].information_gaps)
