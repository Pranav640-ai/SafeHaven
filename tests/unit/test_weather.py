import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import httpx

from app.schemas.common import Coordinates
from app.schemas.alerts import HazardCategory, HazardSeverity
from app.services.weather import OpenMeteoWeatherService, WMO_WEATHER_CODES
from app.services.cache import cache


@pytest.fixture
def weather_service():
    return OpenMeteoWeatherService()


@pytest.fixture
def sample_forecast_data():
    now = datetime.now(timezone.utc)
    base_time = now.replace(minute=0, second=0, microsecond=0)
    times = [(base_time + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(24)]
    return {
        "hourly": {
            "time": times,
            "temperature_2m": [22.5 + i * 0.2 for i in range(24)],
            "precipitation": [0.0] * 10 + [18.5] * 4 + [0.0] * 10,  # heavy rain at hours 10-13
            "precipitation_probability": [10] * 10 + [85] * 4 + [15] * 10,
            "weather_code": [1] * 10 + [95] * 4 + [2] * 10,  # thunderstorm at hours 10-13
            "wind_speed_10m": [12.0] * 24,
            "wind_gusts_10m": [20.0] * 10 + [75.0] * 4 + [20.0] * 10,  # severe gusts
        }
    }


def test_evaluate_activity_weather_thunderstorm(weather_service, sample_forecast_data):
    now = datetime.now(timezone.utc)
    base_time = now.replace(minute=0, second=0, microsecond=0)
    start_time = base_time + timedelta(hours=10)
    end_time = base_time + timedelta(hours=13)

    analysis = weather_service.evaluate_activity_weather(sample_forecast_data, start_time, end_time)

    assert analysis.available is True
    assert analysis.hazard_identified is True
    assert analysis.hazard_category == HazardCategory.SEVERE_WEATHER
    assert analysis.hazard_severity == HazardSeverity.SEVERE
    assert analysis.dominant_weather_code == 95
    assert analysis.max_wind_gusts_kmh == 75.0
    assert analysis.max_precipitation_probability == 85
    assert analysis.uncertainty.level == "low"


def test_evaluate_activity_weather_clear_conditions(weather_service, sample_forecast_data):
    now = datetime.now(timezone.utc)
    base_time = now.replace(minute=0, second=0, microsecond=0)
    start_time = base_time + timedelta(hours=1)
    end_time = base_time + timedelta(hours=4)

    analysis = weather_service.evaluate_activity_weather(sample_forecast_data, start_time, end_time)

    assert analysis.available is True
    assert analysis.hazard_identified is False
    assert analysis.precipitation_sum_mm == 0.0
    assert analysis.max_precipitation_probability == 10


def test_evaluate_weather_exceeds_horizon(weather_service, sample_forecast_data):
    # Beyond 16 days
    future_start = datetime.now(timezone.utc) + timedelta(days=25)
    future_end = future_start + timedelta(hours=3)

    analysis = weather_service.evaluate_activity_weather(sample_forecast_data, future_start, future_end)

    assert analysis.available is False
    assert analysis.uncertainty.level == "high"
    assert "exceeds Open-Meteo forecast horizon" in analysis.uncertainty.description
    assert analysis.hazard_identified is False


def test_evaluate_weather_missing_data(weather_service):
    now = datetime.now(timezone.utc)
    start_time = now + timedelta(hours=1)
    end_time = now + timedelta(hours=3)

    analysis = weather_service.evaluate_activity_weather(None, start_time, end_time)

    assert analysis.available is False
    assert analysis.uncertainty.level == "high"
    assert "unavailable" in analysis.uncertainty.description


@pytest.mark.asyncio
async def test_fetch_forecast_caching(weather_service, sample_forecast_data):
    coords = Coordinates(latitude=15.2993, longitude=74.1240)
    cache_key = f"{round(coords.latitude, 3)}_{round(coords.longitude, 3)}_14"

    # Pre-populate cache
    cache.set("weather", cache_key, sample_forecast_data, ttl_seconds=60)

    data, status = await weather_service.fetch_forecast(coords, forecast_days=14)

    assert status.status == "cached"
    assert data == sample_forecast_data
    assert "Served from memory cache" in status.message


@pytest.mark.asyncio
async def test_fetch_forecast_network_failure(weather_service):
    coords = Coordinates(latitude=9.9252, longitude=78.1198)
    cache.clear("weather")

    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Connection refused")):
        data, status = await weather_service.fetch_forecast(coords)
        assert data is None
        assert status.status == "failed"
        assert "Connection refused" in status.message
