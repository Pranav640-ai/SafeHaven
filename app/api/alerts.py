import math
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from app.schemas.alerts import AlertsResponse, HazardCategory, HazardSeverity, VerificationStatus
from app.schemas.common import Coordinates, PaginationMeta
from app.services.incident_search import haversine_distance_km
from app.services.warning_sources import warning_aggregator

router = APIRouter(prefix="/alerts", tags=["Alerts & Warnings"])


@router.get("", response_model=AlertsResponse, summary="Query Verified Disaster & Travel Alerts")
async def get_alerts(
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Origin latitude"),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Origin longitude"),
    radius_km: float = Query(50.0, ge=1.0, le=500.0, description="Search radius in kilometers"),
    category: Optional[HazardCategory] = Query(None, description="Filter by hazard category"),
    severity: Optional[HazardSeverity] = Query(None, description="Filter by hazard severity"),
    status: Optional[VerificationStatus] = Query(None, description="Filter by verification status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> AlertsResponse:
    """
    Search active hazard bulletins and incident intelligence.
    Supports radial spatial filtering, category, severity, and status filtering with validated pagination.
    """
    all_alerts, _ = await warning_aggregator.fetch_all_warnings()

    filtered = []
    origin_coords = Coordinates(latitude=lat, longitude=lon) if lat is not None and lon is not None else None

    for alert in all_alerts:
        # Spatial filter
        if origin_coords and alert.coordinates:
            dist = haversine_distance_km(origin_coords, alert.coordinates)
            alert_footprint = alert.radius_km or 25.0
            if dist > (radius_km + alert_footprint):
                continue
        elif origin_coords and not alert.coordinates:
            # If coordinates required but alert only has regional text, keep unless filtered out
            pass

        # Category filter
        if category and alert.hazard_category != category:
            continue

        # Severity filter
        if severity and alert.severity != severity:
            continue

        # Status filter
        if status and alert.verification_status != status:
            continue

        filtered.append(alert)

    # Sort newest first
    filtered.sort(key=lambda a: a.published_at, reverse=True)

    total = len(filtered)
    total_pages = max(1, math.ceil(total / page_size))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    items = filtered[start_idx:end_idx]

    return AlertsResponse(
        items=items,
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )
