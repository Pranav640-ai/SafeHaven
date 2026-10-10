import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
import httpx
from pydantic import BaseModel, Field

from app.config import settings
from app.schemas.alerts import HazardCategory, HazardSeverity
from app.schemas.common import Coordinates, SourceStatus, UncertaintyInfo
from app.services.cache import cache

logger = logging.getLogger("safehaven.weather")

WMO_WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


class WeatherWindowAnalysis(BaseModel):
    available: bool
    temperature_min_c: Optional[float] = None
    temperature_max_c: Optional[float] = None
    precipitation_sum_mm: Optional[float] = None
    max_precipitation_probability: Optional[int] = None
    max_wind_speed_kmh: Optional[float] = None
    max_wind_gusts_kmh: Optional[float] = None
    dominant_weather_code: Optional[int] = None
    weather_condition_text: Optional[str] = None
    hazard_identified: bool = False
    hazard_category: Optional[HazardCategory] = None
    hazard_severity: Optional[HazardSeverity] = None
    hazard_details: Optional[str] = None
    data_freshness_seconds: Optional[int] = None
    uncertainty: UncertaintyInfo


class OpenMeteoWeatherService:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.OPEN_METEO_BASE_URL

    async def fetch_forecast(
        self, coordinates: Coordinates, forecast_days: int = 14
    ) -> Tuple[Optional[Dict[str, Any]], SourceStatus]:
        """
        Retrieves hourly and daily forecast from Open-Meteo for coordinates.
        Uses in-memory cache with freshness tracking.
        """
        cache_key = f"{round(coordinates.latitude, 3)}_{round(coordinates.longitude, 3)}_{forecast_days}"
        cached_data, age_seconds = cache.get("weather", cache_key)
        if cached_data is not None:
            return cached_data, SourceStatus(
                source_name="Open-Meteo Weather API",
                status="cached",
                latency_ms=0.0,
                records_count=len(cached_data.get("hourly", {}).get("time", [])),
                message=f"Served from memory cache (freshness: {int(age_seconds or 0)}s)",
                last_fetched_at=datetime.now(timezone.utc),
            )

        params = {
            "latitude": coordinates.latitude,
            "longitude": coordinates.longitude,
            "hourly": "temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max",
            "timezone": "UTC",
            "forecast_days": min(16, max(1, forecast_days)),
        }

        start_time = datetime.now(timezone.utc)
        retries = 2
        last_error = None

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            for attempt in range(retries):
                try:
                    response = await client.get(self.base_url, params=params)
                    elapsed_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
                    response.raise_for_status()
                    data = response.json()

                    # Save in cache
                    cache.set("weather", cache_key, data, settings.WEATHER_CACHE_TTL_SECONDS)

                    return data, SourceStatus(
                        source_name="Open-Meteo Weather API",
                        status="ok",
                        latency_ms=round(elapsed_ms, 2),
                        records_count=len(data.get("hourly", {}).get("time", [])),
                        message="Live forecast retrieved successfully",
                        last_fetched_at=datetime.now(timezone.utc),
                    )
                except httpx.HTTPStatusError as e:
                    last_error = f"HTTP {e.response.status_code}: {e.response.text}"
                    logger.warning(f"Open-Meteo HTTP error (attempt {attempt+1}/{retries}): {last_error}")
                except (httpx.RequestError, Exception) as e:
                    last_error = str(e)
                    logger.warning(f"Open-Meteo request failure (attempt {attempt+1}/{retries}): {last_error}")

        # Return failed status
        return None, SourceStatus(
            source_name="Open-Meteo Weather API",
            status="failed",
            records_count=0,
            message=f"Failed to fetch forecast: {last_error}",
            last_fetched_at=datetime.now(timezone.utc),
        )

    def evaluate_activity_weather(
        self,
        forecast_data: Optional[Dict[str, Any]],
        start_time: datetime,
        end_time: datetime,
    ) -> WeatherWindowAnalysis:
        """
        Evaluates weather conditions for an activity's specific time window.
        Distinguishes missing/out-of-range forecasts from zero risk.
        """
        now = datetime.now(timezone.utc)
        # Check horizon: Open-Meteo provides up to 16 days forecast
        max_horizon = now + timedelta(days=16)
        
        # Ensure start_time and end_time have timezone
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        if start_time > max_horizon:
            return WeatherWindowAnalysis(
                available=False,
                uncertainty=UncertaintyInfo(
                    level="high",
                    description=f"Activity date ({start_time.date()}) exceeds Open-Meteo forecast horizon (max 16 days). Weather risk cannot be evaluated deterministically.",
                    missing_variables=["hourly_forecast", "precipitation", "wind_gusts"],
                    confidence_score=0.2,
                ),
            )

        if not forecast_data or "hourly" not in forecast_data:
            return WeatherWindowAnalysis(
                available=False,
                uncertainty=UncertaintyInfo(
                    level="high",
                    description="Forecast data unavailable due to provider connection failure or missing parameters.",
                    missing_variables=["hourly_data"],
                    confidence_score=0.1,
                ),
            )

        hourly = forecast_data["hourly"]
        times = hourly.get("time", [])
        if not times:
            return WeatherWindowAnalysis(
                available=False,
                uncertainty=UncertaintyInfo(
                    level="moderate",
                    description="Empty forecast time series returned from weather provider.",
                    missing_variables=["time_series"],
                    confidence_score=0.3,
                ),
            )

        # Find overlapping indices
        overlapping_indices: List[int] = []
        for idx, t_str in enumerate(times):
            # Open-Meteo times are formatted as "YYYY-MM-DDTHH:MM" in UTC
            try:
                t_dt = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
                # An hourly slot represents the hour starting at t_dt
                slot_end = t_dt + timedelta(hours=1)
                if slot_end > start_time and t_dt < end_time:
                    overlapping_indices.append(idx)
            except Exception:
                continue

        if not overlapping_indices:
            # Maybe activity is within a day covered, but outside exact hours, or past hourly range
            return WeatherWindowAnalysis(
                available=False,
                uncertainty=UncertaintyInfo(
                    level="moderate",
                    description=f"No hourly forecast slots found overlapping {start_time.isoformat()} to {end_time.isoformat()}.",
                    missing_variables=["hourly_slots"],
                    confidence_score=0.4,
                ),
            )

        temps = [hourly["temperature_2m"][i] for i in overlapping_indices if hourly.get("temperature_2m") and hourly["temperature_2m"][i] is not None]
        precips = [hourly["precipitation"][i] for i in overlapping_indices if hourly.get("precipitation") and hourly["precipitation"][i] is not None]
        probs = [hourly["precipitation_probability"][i] for i in overlapping_indices if hourly.get("precipitation_probability") and hourly["precipitation_probability"][i] is not None]
        winds = [hourly["wind_speed_10m"][i] for i in overlapping_indices if hourly.get("wind_speed_10m") and hourly["wind_speed_10m"][i] is not None]
        gusts = [hourly["wind_gusts_10m"][i] for i in overlapping_indices if hourly.get("wind_gusts_10m") and hourly["wind_gusts_10m"][i] is not None]
        codes = [hourly["weather_code"][i] for i in overlapping_indices if hourly.get("weather_code") and hourly["weather_code"][i] is not None]

        temp_min = min(temps) if temps else None
        temp_max = max(temps) if temps else None
        precip_sum = sum(precips) if precips else 0.0
        max_prob = max(probs) if probs else 0
        max_wind = max(winds) if winds else 0.0
        max_gust = max(gusts) if gusts else 0.0
        dom_code = max(set(codes), key=codes.count) if codes else 0
        condition_text = WMO_WEATHER_CODES.get(dom_code, f"Weather code {dom_code}")

        # Assess hazard severity
        hazard_identified = False
        hazard_cat: Optional[HazardCategory] = None
        hazard_sev: Optional[HazardSeverity] = None
        hazard_details: Optional[str] = None

        # Severe / Extreme checks:
        # Thunderstorms (95, 96, 99)
        if dom_code in [95, 96, 99]:
            hazard_identified = True
            hazard_cat = HazardCategory.SEVERE_WEATHER
            hazard_sev = HazardSeverity.SEVERE if dom_code == 95 else HazardSeverity.EXTREME
            hazard_details = f"{condition_text} forecast during activity window with gusts up to {max_gust:.1f} km/h."
        # Violent rain or flooding rain (>15mm precipitation in window or >10mm/h)
        elif precip_sum >= 15.0 or (dom_code in [82, 65] and max_prob >= 60):
            hazard_identified = True
            hazard_cat = HazardCategory.FLOOD if precip_sum >= 25.0 else HazardCategory.SEVERE_WEATHER
            hazard_sev = HazardSeverity.SEVERE
            hazard_details = f"Heavy rainfall forecast ({precip_sum:.1f} mm, rain prob {max_prob}%) creating waterlogging and flash hazards."
        # Severe wind gusts (>65 km/h)
        elif max_gust >= 65.0:
            hazard_identified = True
            hazard_cat = HazardCategory.SEVERE_WEATHER
            hazard_sev = HazardSeverity.SEVERE
            hazard_details = f"Dangerous wind gusts up to {max_gust:.1f} km/h exceed safe outdoor activity thresholds."
        # Moderate checks
        elif dom_code in [63, 73, 81] or (precip_sum >= 5.0 and max_prob >= 50):
            hazard_identified = True
            hazard_cat = HazardCategory.SEVERE_WEATHER
            hazard_sev = HazardSeverity.MODERATE
            hazard_details = f"{condition_text} with {precip_sum:.1f} mm rain expected ({max_prob}% probability)."
        elif max_gust >= 45.0 or max_wind >= 35.0:
            hazard_identified = True
            hazard_cat = HazardCategory.SEVERE_WEATHER
            hazard_sev = HazardSeverity.MODERATE
            hazard_details = f"Strong winds: {max_wind:.1f} km/h (gusts up to {max_gust:.1f} km/h)."
        elif dom_code in [51, 53, 61, 80] and max_prob >= 40:
            hazard_identified = True
            hazard_cat = HazardCategory.SEVERE_WEATHER
            hazard_sev = HazardSeverity.LOW
            hazard_details = f"Light rain/drizzle ({condition_text}) with {max_prob}% probability."

        confidence = 0.9 if len(overlapping_indices) >= 1 else 0.7

        return WeatherWindowAnalysis(
            available=True,
            temperature_min_c=round(temp_min, 1) if temp_min is not None else None,
            temperature_max_c=round(temp_max, 1) if temp_max is not None else None,
            precipitation_sum_mm=round(precip_sum, 2),
            max_precipitation_probability=int(max_prob),
            max_wind_speed_kmh=round(max_wind, 1),
            max_wind_gusts_kmh=round(max_gust, 1),
            dominant_weather_code=dom_code,
            weather_condition_text=condition_text,
            hazard_identified=hazard_identified,
            hazard_category=hazard_cat,
            hazard_severity=hazard_sev,
            hazard_details=hazard_details,
            uncertainty=UncertaintyInfo(
                level="low" if hazard_identified else "low",
                description="Deterministic hourly forecast matched activity window.",
                confidence_score=confidence,
            ),
        )


weather_service = OpenMeteoWeatherService()
