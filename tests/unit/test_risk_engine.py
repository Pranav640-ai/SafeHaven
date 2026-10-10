import pytest
from datetime import datetime, timezone, timedelta, date
from unittest.mock import patch, MagicMock

from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from app.schemas.common import Coordinates
from app.schemas.itinerary import Activity, ActivityCategory, Itinerary, UserPreferences
from app.schemas.risk import ActionRecommendation, RiskCategory
from app.services.risk_engine import RiskEngine


@pytest.fixture
def risk_engine_instance():
    return RiskEngine()


@pytest.fixture
def base_times():
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = now + timedelta(hours=2)
    end = now + timedelta(hours=5)
    return now, start, end


@pytest.mark.asyncio
async def test_risk_engine_no_matching_hazards(risk_engine_instance, base_times):
    now, start, end = base_times
    act = Activity(
        id="act_1",
        title="Walk around city center",
        category=ActivityCategory.CULTURAL_HERITAGE,
        location_name="Old Town Plaza",
        coordinates=Coordinates(latitude=48.8566, longitude=2.3522),
        start_time=start,
        end_time=end,
    )

    assessment = await risk_engine_instance.assess_activity(
        activity=act,
        destination_name="Paris",
        destination_coords=Coordinates(latitude=48.8566, longitude=2.3522),
        all_alerts=[],
        forecast_data=None,
        source_failures=[],
    )

    assert assessment.risk_category == RiskCategory.LOW
    assert assessment.recommendation == ActionRecommendation.KEEP
    assert assessment.replanning_needed is False
    assert len(assessment.evidence) == 0


@pytest.mark.asyncio
async def test_risk_engine_severe_weather_overlap(risk_engine_instance, base_times):
    now, start, end = base_times
    act = Activity(
        id="act_hike",
        title="Mountain Peak Hike",
        category=ActivityCategory.OUTDOOR_HIKING,
        location_name="Alpine Trailhead",
        coordinates=Coordinates(latitude=46.5, longitude=8.5),
        start_time=start,
        end_time=end,
    )

    # Forecast with thunderstorm and severe gusts
    times_list = [(now + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(24)]
    forecast_data = {
        "hourly": {
            "time": times_list,
            "temperature_2m": [15.0] * 24,
            "precipitation": [0.0] * 2 + [20.0] * 3 + [0.0] * 19,
            "precipitation_probability": [20] * 2 + [90] * 3 + [10] * 19,
            "weather_code": [1] * 2 + [95] * 3 + [1] * 19,
            "wind_speed_10m": [15.0] * 24,
            "wind_gusts_10m": [20.0] * 2 + [70.0] * 3 + [20.0] * 19,
        }
    }

    assessment = await risk_engine_instance.assess_activity(
        activity=act,
        destination_name="Alps",
        destination_coords=Coordinates(latitude=46.5, longitude=8.5),
        all_alerts=[],
        forecast_data=forecast_data,
        source_failures=[],
    )

    assert assessment.risk_score >= 50.0
    assert assessment.risk_category in [RiskCategory.HIGH_CONCERN, RiskCategory.VERY_HIGH_CONCERN]
    assert assessment.replanning_needed is True
    assert len(assessment.evidence) >= 1
    assert any("Thunderstorm" in ev.headline or "Severe" in ev.headline for ev in assessment.evidence)


@pytest.mark.asyncio
async def test_risk_engine_warning_outside_geographic_area(risk_engine_instance, base_times):
    now, start, end = base_times
    act = Activity(
        id="act_tokyo",
        title="Museum Visit",
        category=ActivityCategory.INDOOR_MUSEUM,
        location_name="Tokyo Museum",
        coordinates=Coordinates(latitude=35.6762, longitude=139.6503),
        start_time=start,
        end_time=end,
    )

    # Warning in Europe (Paris)
    far_alert = WarningAlert(
        id="alert_paris_flood",
        source_org="Meteo France",
        published_at=now,
        valid_from=now,
        valid_until=now + timedelta(days=2),
        hazard_category=HazardCategory.FLOOD,
        severity=HazardSeverity.SEVERE,
        title="Seine River Flooding",
        original_text="Flood alert for Seine valley.",
        geographic_coverage="Paris Region, France",
        coordinates=Coordinates(latitude=48.8566, longitude=2.3522),
        radius_km=30.0,
        verification_status=VerificationStatus.OFFICIAL,
    )

    assessment = await risk_engine_instance.assess_activity(
        activity=act,
        destination_name="Tokyo",
        destination_coords=Coordinates(latitude=35.6762, longitude=139.6503),
        all_alerts=[far_alert],
        forecast_data=None,
        source_failures=[],
    )

    assert assessment.risk_category == RiskCategory.LOW
    assert len(assessment.evidence) == 0


@pytest.mark.asyncio
async def test_risk_engine_warning_outside_temporal_window(risk_engine_instance, base_times):
    now, start, end = base_times
    act = Activity(
        id="act_today",
        title="Coastal Walk",
        category=ActivityCategory.OUTDOOR_SIGHTSEEING,
        location_name="Coast",
        coordinates=Coordinates(latitude=25.0, longitude=55.0),
        start_time=start,
        end_time=end,
    )

    # Warning that expired yesterday
    expired_alert = WarningAlert(
        id="alert_expired",
        source_org="Coast Guard",
        published_at=now - timedelta(days=3),
        valid_from=now - timedelta(days=3),
        valid_until=now - timedelta(days=1),
        hazard_category=HazardCategory.SEVERE_WEATHER,
        severity=HazardSeverity.EXTREME,
        title="Cyclone Warning",
        original_text="Cyclone passed yesterday.",
        geographic_coverage="Coast",
        coordinates=Coordinates(latitude=25.0, longitude=55.0),
        radius_km=50.0,
        verification_status=VerificationStatus.OFFICIAL,
    )

    assessment = await risk_engine_instance.assess_activity(
        activity=act,
        destination_name="Coast",
        destination_coords=Coordinates(latitude=25.0, longitude=55.0),
        all_alerts=[expired_alert],
        forecast_data=None,
        source_failures=[],
    )

    assert assessment.risk_category == RiskCategory.LOW
    assert len(assessment.evidence) == 0


@pytest.mark.asyncio
async def test_risk_engine_mandatory_closure_override(risk_engine_instance, base_times):
    now, start, end = base_times
    act = Activity(
        id="act_trail",
        title="Forest Trail Exploration",
        category=ActivityCategory.OUTDOOR_HIKING,
        location_name="Pine Forest",
        coordinates=Coordinates(latitude=37.7749, longitude=-122.4194),
        start_time=start,
        end_time=end,
    )

    closure_alert = WarningAlert(
        id="alert_evac",
        source_org="State Fire Department",
        published_at=now,
        valid_from=now,
        valid_until=now + timedelta(days=2),
        hazard_category=HazardCategory.WILDFIRE,
        severity=HazardSeverity.EXTREME,
        title="Mandatory Evacuation & Trail Closure",
        original_text="All trails closed due to active wildfire. Mandatory evacuation ordered.",
        geographic_coverage="Pine Forest",
        coordinates=Coordinates(latitude=37.7749, longitude=-122.4194),
        radius_km=20.0,
        is_mandatory_override=True,
        verification_status=VerificationStatus.OFFICIAL,
    )

    assessment = await risk_engine_instance.assess_activity(
        activity=act,
        destination_name="Pine Forest",
        destination_coords=Coordinates(latitude=37.7749, longitude=-122.4194),
        all_alerts=[closure_alert],
        forecast_data=None,
        source_failures=[],
    )

    assert assessment.risk_category == RiskCategory.VERY_HIGH_CONCERN
    assert assessment.risk_score >= 95.0
    assert assessment.recommendation == ActionRecommendation.AVOID
    assert len(assessment.mandatory_overrides) >= 1
    assert assessment.mandatory_overrides[0].active is True
    assert assessment.replanning_needed is True


@pytest.mark.asyncio
async def test_risk_engine_source_failure_uncertainty_handling(risk_engine_instance, base_times):
    now, start, end = base_times
    act = Activity(
        id="act_plain",
        title="City Sightseeing",
        category=ActivityCategory.OUTDOOR_SIGHTSEEING,
        location_name="Downtown",
        coordinates=Coordinates(latitude=12.9716, longitude=77.5946),
        start_time=start,
        end_time=end,
    )

    # External source failures reported
    assessment = await risk_engine_instance.assess_activity(
        activity=act,
        destination_name="Bengaluru",
        destination_coords=Coordinates(latitude=12.9716, longitude=77.5946),
        all_alerts=[],
        forecast_data=None,
        source_failures=["Open-Meteo Weather API", "GDACS Disaster Feed"],
    )

    assert assessment.uncertainty.level in ["moderate", "high"]
    assert "source failures occurred" in assessment.uncertainty.description
    assert "Open-Meteo Weather API" in assessment.uncertainty.missing_variables
