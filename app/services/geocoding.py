import logging
from typing import Dict, List, Optional, Tuple
import httpx

from app.config import settings
from app.schemas.common import Coordinates
from app.services.cache import cache

logger = logging.getLogger("safehaven.geocoding")


class GeocodingService:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.NOMINATIM_BASE_URL
        self.headers = {"User-Agent": settings.GEOCODING_USER_AGENT}

    async def geocode(self, query: str) -> Optional[Tuple[Coordinates, str]]:
        """
        Geocodes a destination/location query to (Coordinates, display_name).
        Uses memory cache.
        """
        cache_key = f"geo_{query.lower().strip()}"
        cached, _ = cache.get("geocoding", cache_key)
        if cached is not None:
            return Coordinates(latitude=cached["lat"], longitude=cached["lon"]), cached["name"]

        params = {"q": query, "format": "json", "limit": 1}

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(f"{self.base_url}/search", params=params, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()

                if data and len(data) > 0:
                    first = data[0]
                    lat = float(first["lat"])
                    lon = float(first["lon"])
                    display_name = first.get("display_name", query)
                    coords = Coordinates(latitude=lat, longitude=lon)

                    cache.set(
                        "geocoding",
                        cache_key,
                        {"lat": lat, "lon": lon, "name": display_name},
                        ttl_seconds=86400,
                    )
                    return coords, display_name
        except Exception as e:
            logger.warning(f"Geocoding lookup failed for '{query}': {e}")

        return None


geocoding_service = GeocodingService()
