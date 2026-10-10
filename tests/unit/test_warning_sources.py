import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import httpx

from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from app.schemas.common import Coordinates
from app.services.warning_sources import GDACSAdapter, USGSAdapter, ReliefWebAdapter, LocalAuthoritativeAdapter, WarningAggregatorService
from app.services.incident_search import haversine_distance_km, IncidentSearchService
from app.services.cache import cache


def test_haversine_distance_calculation():
    # Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522) ~ 343 km
    london = Coordinates(latitude=51.5074, longitude=-0.1278)
    paris = Coordinates(latitude=48.8566, longitude=2.3522)
    dist = haversine_distance_km(london, paris)
    assert 340 < dist < 350


def test_temporal_relevance_matching():
    search = IncidentSearchService()
    now = datetime.now(timezone.utc)

    alert = WarningAlert(
        id="test_alert_1",
        source_org="National Weather Service",
        published_at=now,
        valid_from=now,
        valid_until=now + timedelta(hours=12),
        hazard_category=HazardCategory.FLOOD,
        severity=HazardSeverity.SEVERE,
        title="Flash Flood Warning",
        original_text="Severe flash flooding expected.",
        geographic_coverage="Alpine Valley",
        coordinates=Coordinates(latitude=46.5, longitude=8.5),
        radius_km=25.0,
        verification_status=VerificationStatus.OFFICIAL,
    )

    # Activity inside window
    act_start = now + timedelta(hours=2)
    act_end = now + timedelta(hours=5)
    is_rel, overlap = search.is_temporally_relevant(alert, act_start, act_end)
    assert is_rel is True
    assert overlap > 0

    # Activity far outside window (3 days later)
    future_start = now + timedelta(days=3)
    future_end = now + timedelta(days=3, hours=3)
    is_rel_fut, overlap_fut = search.is_temporally_relevant(alert, future_start, future_end)
    assert is_rel_fut is False
    assert overlap_fut == 0.0


def test_geographic_relevance_matching():
    search = IncidentSearchService()
    alert_coords = Coordinates(latitude=46.500, longitude=8.500)
    nearby_target = Coordinates(latitude=46.520, longitude=8.520)  # ~2.7 km away
    far_target = Coordinates(latitude=47.500, longitude=9.500)     # > 100 km away

    alert = WarningAlert(
        id="geo_test",
        source_org="State Emergency Service",
        published_at=datetime.now(timezone.utc),
        hazard_category=HazardCategory.WILDFIRE,
        severity=HazardSeverity.SEVERE,
        title="Forest Fire Alert",
        original_text="Active wildfire spreading rapidly.",
        geographic_coverage="Pine Ridge Zone",
        coordinates=alert_coords,
        radius_km=15.0,
        verification_status=VerificationStatus.OFFICIAL,
    )

    # Nearby target within radius
    is_rel, dist, score = search.is_geographically_relevant(alert, nearby_target, "Pine Ridge", threshold_radius_km=20.0)
    assert is_rel is True
    assert dist is not None and dist < 10.0
    assert score > 0.5

    # Far target outside radius
    is_rel_far, dist_far, score_far = search.is_geographically_relevant(alert, far_target, "Different Place", threshold_radius_km=20.0)
    assert is_rel_far is False
    assert dist_far is not None and dist_far > 50.0


@pytest.mark.asyncio
async def test_gdacs_xml_parser():
    sample_xml = """<?xml version="1.0" encoding="utf-8"?>
    <rss version="2.0" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#" xmlns:gdacs="http://www.gdacs.org">
        <channel>
            <title>GDACS Current Alerts</title>
            <item>
                <title>Orange Flood in Bangladesh</title>
                <link>https://www.gdacs.org/report.aspx?eventid=100</link>
                <description>Major river flooding reported.</description>
                <pubDate>Mon, 01 Jan 2026 12:00:00 GMT</pubDate>
                <geo:lat>23.8103</geo:lat>
                <geo:long>90.4125</geo:long>
                <gdacs:alertlevel>Orange</gdacs:alertlevel>
                <gdacs:country>Bangladesh</gdacs:country>
                <guid>gdacs_100</guid>
            </item>
        </channel>
    </rss>"""

    adapter = GDACSAdapter(feed_url="http://mock-gdacs.local")
    cache.clear("warnings")

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.text = sample_xml
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        alerts, status = await adapter.fetch_warnings()
        assert status.status == "ok"
        assert len(alerts) == 1
        a = alerts[0]
        assert a.hazard_category == HazardCategory.FLOOD
        assert a.severity == HazardSeverity.SEVERE
        assert a.coordinates.latitude == 23.8103
        assert a.coordinates.longitude == 90.4125


@pytest.mark.asyncio
async def test_usgs_geojson_parser():
    sample_geojson = {
        "features": [
            {
                "id": "usgs_quake_1",
                "properties": {
                    "mag": 6.8,
                    "place": "12 km SW of Hualien City, Taiwan",
                    "time": 1700000000000,
                    "url": "https://earthquake.usgs.gov/earthquakes/event/1",
                    "status": "reviewed",
                },
                "geometry": {
                    "coordinates": [121.6, 23.9, 10.0]
                }
            }
        ]
    }

    adapter = USGSAdapter(feed_url="http://mock-usgs.local")
    cache.clear("warnings")

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = sample_geojson
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        alerts, status = await adapter.fetch_warnings()
        assert status.status == "ok"
        assert len(alerts) == 1
        quake = alerts[0]
        assert quake.hazard_category == HazardCategory.EARTHQUAKE
        assert quake.severity == HazardSeverity.EXTREME
        assert quake.is_mandatory_override is True
        assert quake.coordinates.latitude == 23.9
