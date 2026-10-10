import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple

from backend.intelligence.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from backend.intelligence.schemas.common import Coordinates


def haversine_distance_km(coord1: Coordinates, coord2: Coordinates) -> float:
    """
    Computes great-circle distance between two geographic points using Haversine formula.
    """
    R = 6371.0  # Earth's radius in kilometers

    lat1_rad = math.radians(coord1.latitude)
    lon1_rad = math.radians(coord1.longitude)
    lat2_rad = math.radians(coord2.latitude)
    lon2_rad = math.radians(coord2.longitude)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class IncidentSearchService:
    def is_temporally_relevant(
        self,
        alert: WarningAlert,
        start_time: datetime,
        end_time: datetime,
        buffer_hours: float = 6.0,
    ) -> Tuple[bool, float]:
        """
        Determines if the alert's validity or occurrence overlaps the activity window.
        Returns: (is_relevant, overlap_hours)
        """
        now = datetime.now(timezone.utc)
        alert_start = alert.valid_from or alert.published_at
        alert_end = alert.valid_until
        if alert_end is None:
            return False, 0.0  # Unknown validity is not an active travel warning.

        # Ensure tz-awareness
        if alert_start.tzinfo is None:
            alert_start = alert_start.replace(tzinfo=timezone.utc)
        if alert_end.tzinfo is None:
            alert_end = alert_end.replace(tzinfo=timezone.utc)
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        # Apply buffer hours around activity
        window_start = start_time - timedelta(hours=buffer_hours) if hasattr(math, "timedelta") else start_time
        # Use python datetime.timedelta safely:
        from datetime import timedelta
        window_start = start_time - timedelta(hours=buffer_hours)
        window_end = end_time + timedelta(hours=buffer_hours)

        overlap_start = max(alert_start, window_start)
        overlap_end = min(alert_end, window_end)

        if overlap_start < overlap_end:
            overlap_hours = (overlap_end - overlap_start).total_seconds() / 3600.0
            return True, max(0.0, overlap_hours)

        return False, 0.0

    def is_geographically_relevant(
        self,
        alert: WarningAlert,
        target_coords: Coordinates,
        destination_name: str,
        threshold_radius_km: float = 50.0,
    ) -> Tuple[bool, Optional[float], float]:
        """
        Assesses geographic relevance:
        - If alert has coordinates: uses Haversine distance against alert radius + threshold.
        - If alert has no coordinates: checks textual matches in coverage/title.
        Returns: (is_relevant, distance_km, relevance_score [0..1])
        """
        if alert.coordinates is not None:
            dist = haversine_distance_km(target_coords, alert.coordinates)
            effective_radius = alert.radius_km if alert.radius_km is not None else threshold_radius_km

            if dist <= effective_radius:
                # Closer distance = higher geographic relevance score
                relevance = max(0.1, 1.0 - (dist / effective_radius))
                return True, round(dist, 2), round(relevance, 2)
            else:
                return False, round(dist, 2), 0.0

        # Textual match when coordinates are not available
        dest_clean = destination_name.lower().strip()
        coverage_clean = alert.geographic_coverage.lower()
        title_clean = alert.title.lower()

        # Check for destination name or country match
        if (dest_clean and dest_clean in coverage_clean) or (dest_clean and dest_clean in title_clean):
            # Textual match has moderate geographic relevance since exact radius is uncertain
            return True, None, 0.65

        return False, None, 0.0

    def filter_and_rank_incidents(
        self,
        alerts: List[WarningAlert],
        target_coords: Coordinates,
        destination_name: str,
        start_time: datetime,
        end_time: datetime,
        max_distance_km: float = 50.0,
    ) -> List[Tuple[WarningAlert, float, Optional[float], float]]:
        """
        Filters alerts relevant to location and time window.
        Returns: List of tuples: (alert, geo_relevance, distance_km, overlap_hours)
        """
        relevant: List[Tuple[WarningAlert, float, Optional[float], float]] = []

        for alert in alerts:
            geo_relevant, dist_km, geo_score = self.is_geographically_relevant(
                alert, target_coords, destination_name, threshold_radius_km=max_distance_km
            )
            if not geo_relevant:
                continue

            time_relevant, overlap_hours = self.is_temporally_relevant(
                alert, start_time, end_time
            )
            if not time_relevant:
                continue

            relevant.append((alert, geo_score, dist_km, overlap_hours))

        return relevant


incident_search_service = IncidentSearchService()
