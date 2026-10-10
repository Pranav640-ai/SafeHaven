import pytest
from datetime import datetime, timezone, timedelta, date
from unittest.mock import patch, MagicMock, AsyncMock

from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from app.schemas.common import Coordinates, SourceStatus
from app.schemas.destinations import CandidatePlace
from app.schemas.itinerary import Activity, ActivityCategory, Itinerary, UserPreferences
from app.schemas.replanning import ActivityChangeType
from app.services.replanner import (
    TripReplannerService,
    LLMReplanningResult,
    LLMActivityDecision,
)


@pytest.fixture
def replanner_service():
    return TripReplannerService()


@pytest.fixture
def sample_itinerary():
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    today = now.date()

    act1 = Activity(
        id="act_safe",
        title="Visit Central Library",
        category=ActivityCategory.INDOOR_MUSEUM,
        location_name="City Central Library",
        coordinates=Coordinates(latitude=40.7128, longitude=-74.0060),
        start_time=now + timedelta(hours=1),
        end_time=now + timedelta(hours=3),
    )

    act2 = Activity(
        id="act_risky",
        title="Summit Ridge Hike",
        category=ActivityCategory.OUTDOOR_HIKING,
        location_name="High Peak Trailhead",
        coordinates=Coordinates(latitude=40.7500, longitude=-74.0500),
        start_time=now + timedelta(hours=4),
        end_time=now + timedelta(hours=7),
    )

    return Itinerary(
        id="itin_test_1",
        destination_name="Metro Valley",
        destination_coordinates=Coordinates(latitude=40.7128, longitude=-74.0060),
        start_date=today,
        end_date=today,
        activities=[act1, act2],
    )


@pytest.mark.asyncio
async def test_deterministic_replanner_preserves_safe_and_modifies_risky(
    replanner_service, sample_itinerary
):
    now = datetime.now(timezone.utc)

    # Active flood alert covering act2
    flood_alert = WarningAlert(
        id="alert_flood_summit",
        source_org="Disaster Management Agency",
        published_at=now,
        valid_from=now,
        valid_until=now + timedelta(days=1),
        hazard_category=HazardCategory.FLOOD,
        severity=HazardSeverity.SEVERE,
        title="Flash Flood at High Peak",
        original_text="Severe flash flooding on mountain trail.",
        geographic_coverage="High Peak Trailhead",
        coordinates=Coordinates(latitude=40.7500, longitude=-74.0500),
        radius_km=3.0,
        is_mandatory_override=True,
        verification_status=VerificationStatus.OFFICIAL,
    )

    # Candidate alternative safe in city
    safe_candidate = CandidatePlace(
        id="osm_98765",
        name="Valley Botanical Conservatory",
        coordinates=Coordinates(latitude=40.7200, longitude=-74.0100),
        category=ActivityCategory.NATURE_WILDLIFE,
        distance_km=4.5,
        ranking_explanation="Safe indoor/outdoor garden outside flood zone",
    )

    with patch("app.services.warning_sources.warning_aggregator.fetch_all_warnings") as mock_warn, \
         patch("app.services.places.places_service.find_nearby_places") as mock_places, \
         patch("app.services.weather.weather_service.fetch_forecast") as mock_weather:

        mock_weather.return_value = (None, SourceStatus(source_name="Open-Meteo", status="ok"))
        mock_warn.return_value = ([flood_alert], [])
        mock_places.return_value = ([safe_candidate], MagicMock(status="ok"))

        res = await replanner_service.replan_itinerary(sample_itinerary, force_deterministic=True)

        assert res.replanner_mode == "deterministic_rule_engine"
        assert len(res.changed_activities) == 2

        # act1 (library) preserved
        rec1 = next(r for r in res.changed_activities if r.original_activity_id == "act_safe")
        assert rec1.change_type == ActivityChangeType.UNCHANGED
        assert rec1.revised_activity.id == "act_safe"

        # act2 (hike) modified with safe candidate
        rec2 = next(r for r in res.changed_activities if r.original_activity_id == "act_risky")
        assert rec2.change_type == ActivityChangeType.MODIFIED
        assert rec2.selected_candidate_id == "osm_98765"
        assert rec2.revised_activity.location_name == "Valley Botanical Conservatory"
        assert rec2.revised_activity.coordinates.latitude == 40.7200


@pytest.mark.asyncio
async def test_replanner_no_alternative_available_cancels_honestly(
    replanner_service, sample_itinerary
):
    now = datetime.now(timezone.utc)

    # Evacuation order on act2
    evac_alert = WarningAlert(
        id="alert_evac",
        source_org="State Governor",
        published_at=now,
        valid_from=now,
        valid_until=now + timedelta(days=2),
        hazard_category=HazardCategory.WILDFIRE,
        severity=HazardSeverity.EXTREME,
        title="Wildfire Evacuation",
        original_text="Immediate evacuation.",
        geographic_coverage="High Peak Trailhead",
        coordinates=Coordinates(latitude=40.7500, longitude=-74.0500),
        radius_km=25.0,
        is_mandatory_override=True,
        verification_status=VerificationStatus.OFFICIAL,
    )

    with patch("app.services.warning_sources.warning_aggregator.fetch_all_warnings") as mock_warn, \
         patch("app.services.places.places_service.find_nearby_places") as mock_places, \
         patch("app.services.weather.weather_service.fetch_forecast") as mock_weather:

        mock_weather.return_value = (None, SourceStatus(source_name="Open-Meteo", status="ok"))
        mock_warn.return_value = ([evac_alert], [])
        mock_places.return_value = ([], MagicMock(status="ok"))  # No places found

        res = await replanner_service.replan_itinerary(sample_itinerary, force_deterministic=True)

        rec2 = next(r for r in res.changed_activities if r.original_activity_id == "act_risky")
        assert rec2.change_type == ActivityChangeType.CANCELLED
        assert rec2.revised_activity is None
        assert "No verified safe nearby alternative" in rec2.reason_for_change


def test_validator_rejects_hallucinated_candidate_id(replanner_service, sample_itinerary):
    mock_llm_result = LLMReplanningResult(
        decisions=[
            LLMActivityDecision(
                activity_id="act_safe",
                action="unchanged",
                reason="Safe",
            ),
            LLMActivityDecision(
                activity_id="act_risky",
                action="modify",
                selected_candidate_id="hallucinated_fake_place_999",  # NOT in candidates map!
                reason="Modified",
            ),
        ],
        general_summary="Changed plan",
    )

    valid_cand = CandidatePlace(
        id="real_cand_1",
        name="Real Park",
        coordinates=Coordinates(latitude=40.7, longitude=-74.0),
        category=ActivityCategory.NATURE_WILDLIFE,
        distance_km=2.0,
        ranking_explanation="",
    )
    candidates_map = {"act_risky": [valid_cand]}

    is_valid, errors = replanner_service._validate_llm_output(
        llm_res=mock_llm_result,
        itinerary=sample_itinerary,
        candidates_map=candidates_map,
        assessment_by_id={},
    )

    assert is_valid is False
    assert any("invented or invalid candidate ID" in err for err in errors)


def test_validator_rejects_modifying_safe_activity(replanner_service, sample_itinerary):
    # If LLM tries to alter act_safe when assessment marked replanning_needed=False
    mock_ass_safe = MagicMock(replanning_needed=False)
    mock_ass_risky = MagicMock(replanning_needed=True)

    assessment_by_id = {"act_safe": mock_ass_safe, "act_risky": mock_ass_risky}

    mock_llm_result = LLMReplanningResult(
        decisions=[
            LLMActivityDecision(
                activity_id="act_safe",
                action="cancel",  # INVALID: altering safe activity
                reason="Random change",
            ),
            LLMActivityDecision(
                activity_id="act_risky",
                action="cancel",
                reason="Dangerous",
            ),
        ],
        general_summary="Summary",
    )

    is_valid, errors = replanner_service._validate_llm_output(
        llm_res=mock_llm_result,
        itinerary=sample_itinerary,
        candidates_map={},
        assessment_by_id=assessment_by_id,
    )

    assert is_valid is False
    assert any("altered safe activity" in err for err in errors)
