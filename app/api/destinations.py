from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from app.schemas.common import Coordinates
from app.schemas.destinations import NearbyDestinationsResponse
from app.schemas.itinerary import Activity, ActivityCategory, UserPreferences
from app.services.alternative_ranker import alternative_ranker
from app.services.places import places_service
from app.services.warning_sources import warning_aggregator

router = APIRouter(prefix="/destinations", tags=["Destinations & Alternatives"])


@router.get("/nearby", response_model=NearbyDestinationsResponse, summary="Discover & Rank Nearby Safe Experiences")
async def get_nearby_destinations(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Origin latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Origin longitude"),
    category: ActivityCategory = Query(..., description="Target activity category to match"),
    radius_km: float = Query(10.0, ge=1.0, le=100.0, description="Discovery search radius in km"),
    prefer_indoor: bool = Query(False, description="Prefer indoor venues (e.g. during adverse weather)"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of candidates to return"),
) -> NearbyDestinationsResponse:
    """
    Discovers candidate alternative places from OpenStreetMap and ranks them
    using experience similarity, proximity decay, and hazard zone filtering.
    """
    origin = Coordinates(latitude=latitude, longitude=longitude)

    # 1. Query OSM places
    raw_candidates, source_status = await places_service.find_nearby_places(
        origin=origin,
        radius_km=radius_km,
        preferred_category=category,
        limit=limit * 2,
    )

    # 2. Fetch active warnings for risk filtering
    all_alerts, _ = await warning_aggregator.fetch_all_warnings()

    # 3. Create dummy activity for ranking context
    from datetime import datetime, timezone, timedelta
    dummy_act = Activity(
        id="query_origin",
        title="Original Planned Activity",
        category=category,
        location_name="Origin Location",
        coordinates=origin,
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc) + timedelta(hours=3),
    )

    user_prefs = UserPreferences(
        prefer_indoor_on_weather_risk=prefer_indoor,
        max_alternative_distance_km=radius_km,
    )

    eligible, _ = alternative_ranker.filter_and_rank_alternatives(
        original_activity=dummy_act,
        candidates=raw_candidates,
        all_alerts=all_alerts,
        user_preferences=user_prefs,
        is_weather_hazard=prefer_indoor,
        search_radius_km=radius_km,
    )

    return NearbyDestinationsResponse(
        origin_coordinates=origin,
        search_radius_km=radius_km,
        total_candidates_found=len(eligible),
        candidates=eligible[:limit],
        source_status=source_status,
    )
