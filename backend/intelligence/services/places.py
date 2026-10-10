import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import httpx
import ssl

from backend.intelligence.config import settings
from backend.intelligence.schemas.common import Coordinates, SourceStatus
from backend.intelligence.schemas.destinations import CandidatePlace
from backend.intelligence.schemas.itinerary import ActivityCategory
from backend.intelligence.services.cache import cache
from backend.intelligence.services.incident_search import haversine_distance_km

logger = logging.getLogger("safehaven.places")


def map_osm_tags_to_category(tags: Dict[str, str]) -> ActivityCategory:
    tourism = tags.get("tourism", "").lower()
    historic = tags.get("historic", "").lower()
    leisure = tags.get("leisure", "").lower()
    amenity = tags.get("amenity", "").lower()

    if tourism in ["museum", "gallery"] or amenity in ["arts_centre", "planetarium", "library"]:
        return ActivityCategory.INDOOR_MUSEUM
    if historic or tourism in ["monument", "castle", "archaeological_site", "ruins"]:
        return ActivityCategory.CULTURAL_HERITAGE
    if leisure in ["nature_reserve", "park", "garden"] or tags.get("natural") in ["peak", "wood", "forest"]:
        return ActivityCategory.NATURE_WILDLIFE
    if leisure in ["track"] or "hiking" in tags or "trail" in tags:
        return ActivityCategory.OUTDOOR_HIKING
    if leisure in ["beach", "water_park"] or tags.get("natural") == "beach":
        return ActivityCategory.OUTDOOR_BEACH
    if amenity in ["restaurant", "cafe", "food_court"]:
        return ActivityCategory.INDOOR_DINING

    return ActivityCategory.OUTDOOR_SIGHTSEEING


class OSMPlacesService:
    def __init__(self, overpass_url: Optional[str] = None):
        self.overpass_url = overpass_url or settings.OVERPASS_BASE_URL
        self.headers = {"User-Agent": settings.GEOCODING_USER_AGENT}

    async def find_nearby_places(
        self,
        origin: Coordinates,
        radius_km: float = 10.0,
        preferred_category: Optional[ActivityCategory] = None,
        limit: int = 15,
    ) -> Tuple[List[CandidatePlace], SourceStatus]:
        """
        Discovers genuine candidate places around coordinates using OpenStreetMap Overpass API.
        Uses in-memory cache and returns information gaps honestly without fabricating data.
        """
        cache_key = f"places_{round(origin.latitude, 3)}_{round(origin.longitude, 3)}_{int(radius_km)}"
        cached, age = cache.get("places", cache_key)
        if cached is not None:
            return cached[:limit], SourceStatus(
                source_name="OpenStreetMap Overpass API",
                status="cached",
                latency_ms=0.0,
                records_count=len(cached),
                message=f"Served {len(cached)} candidate places from cache (age: {int(age or 0)}s)",
                last_fetched_at=datetime.now(timezone.utc),
            )

        radius_meters = int(radius_km * 1000)
        overpass_query = f"""
        [out:json][timeout:8];
        (
          node["tourism"~"attraction|museum|viewpoint|gallery|theme_park"](around:{radius_meters},{origin.latitude},{origin.longitude});
          node["historic"~"monument|castle|archaeological_site|ruins|memorial"](around:{radius_meters},{origin.latitude},{origin.longitude});
          node["leisure"~"park|nature_reserve|garden|water_park"](around:{radius_meters},{origin.latitude},{origin.longitude});
        );
        out center {limit * 3};
        """

        start = datetime.now(timezone.utc)
        candidates: List[CandidatePlace] = []

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS, verify=ssl.create_default_context()) as client:
                resp = await client.post(
                    self.overpass_url,
                    data={"data": overpass_query},
                    headers=self.headers,
                )
                resp.raise_for_status()
                data = resp.json()

            elapsed_ms = (datetime.now(timezone.utc) - start).total_seconds() * 1000

            elements = data.get("elements", [])
            seen_names = set()

            for elem in elements:
                tags = elem.get("tags", {})
                name = tags.get("name") or tags.get("name:en")
                if not name or name in seen_names:
                    continue
                seen_names.add(name)

                lat = elem.get("lat") or elem.get("center", {}).get("lat")
                lon = elem.get("lon") or elem.get("center", {}).get("lon")
                if lat is None or lon is None:
                    continue

                place_coords = Coordinates(latitude=lat, longitude=lon)
                dist_km = haversine_distance_km(origin, place_coords)
                if dist_km > radius_km:
                    continue

                category = map_osm_tags_to_category(tags)
                osm_id = str(elem.get("id"))
                osm_type = elem.get("type", "node")

                # Identify honest information gaps
                gaps = []
                if "opening_hours" not in tags:
                    gaps.append("Opening hours not cataloged in OpenStreetMap")
                if "wheelchair" not in tags:
                    gaps.append("Accessibility / wheelchair data unverified")
                if "fee" not in tags:
                    gaps.append("Pricing or admission fee not specified")

                desc = tags.get("description") or tags.get("tourism") or tags.get("historic") or "Local attraction"

                cand = CandidatePlace(
                    id=f"osm_{osm_id}",
                    name=name,
                    coordinates=place_coords,
                    category=category,
                    osm_id=osm_id,
                    osm_type=osm_type,
                    tags={k: v for k, v in tags.items() if len(k) < 30 and len(v) < 100},
                    source_url=f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
                    distance_km=round(dist_km, 2),
                    description=desc,
                    information_gaps=gaps,
                    similarity_score=0.0,
                    distance_score=0.0,
                    feasibility_score=0.0,
                    composite_score=0.0,
                    ranking_explanation="Raw candidate discovered via OpenStreetMap",
                )
                candidates.append(cand)

            # Sort by distance
            candidates.sort(key=lambda c: c.distance_km)
            cache.set("places", cache_key, candidates, settings.PLACES_CACHE_TTL_SECONDS)

            return candidates[:limit], SourceStatus(
                source_name="OpenStreetMap Overpass API",
                status="ok",
                latency_ms=round(elapsed_ms, 2),
                records_count=len(candidates),
                message=f"Discovered {len(candidates)} real places within {radius_km}km",
                last_fetched_at=datetime.now(timezone.utc),
            )

        except Exception as e:
            logger.warning(f"Overpass API error or timeout: {e}")
            return [], SourceStatus(
                source_name="OpenStreetMap Overpass API",
                status="failed",
                records_count=0,
                message="Provider request failed; current source coverage is unavailable.",
                last_fetched_at=datetime.now(timezone.utc),
            )


places_service = OSMPlacesService()
