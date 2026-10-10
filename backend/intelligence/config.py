"""Adapted feature/backend provider settings; shares the current backend environment."""
import os
from dataclasses import dataclass

def number(key, default):
    return float(os.getenv(key, default))

@dataclass
class Settings:
    GEOCODING_USER_AGENT: str = os.getenv('GEOCODING_USER_AGENT', 'Meridian travel planning/0.2')
    OPEN_METEO_BASE_URL: str = os.getenv('OPEN_METEO_BASE_URL', 'https://api.open-meteo.com/v1/forecast')
    OVERPASS_BASE_URL: str = os.getenv('OVERPASS_BASE_URL', 'https://overpass-api.de/api/interpreter')
    GDACS_FEED_URL: str = os.getenv('GDACS_FEED_URL', 'https://www.gdacs.org/xml/rss.xml')
    USGS_EARTHQUAKE_FEED_URL: str = os.getenv('USGS_EARTHQUAKE_FEED_URL', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson')
    RELIEFWEB_APPNAME: str = os.getenv('RELIEFWEB_APPNAME', '')
    RELIEFWEB_API_URL: str = os.getenv('RELIEFWEB_API_URL', '')
    REQUEST_TIMEOUT_SECONDS: float = 10
    WEATHER_CACHE_TTL_SECONDS: int = 900
    WARNINGS_CACHE_TTL_SECONDS: int = 900
    PLACES_CACHE_TTL_SECONDS: int = 3600
    WEIGHT_HAZARD: float = number('WEIGHT_HAZARD', .35)
    WEIGHT_PROXIMITY: float = number('WEIGHT_PROXIMITY', .25)
    WEIGHT_TEMPORAL: float = number('WEIGHT_TEMPORAL', .25)
    WEIGHT_CONFIDENCE: float = number('WEIGHT_CONFIDENCE', .15)
    WEIGHT_SIMILARITY: float = .45
    WEIGHT_DISTANCE: float = .35
    WEIGHT_FEASIBILITY: float = .20
settings = Settings()
