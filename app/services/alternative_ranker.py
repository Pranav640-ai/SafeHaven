import logging
from typing import Dict, List, Optional, Tuple
from app.config import settings
from app.schemas.alerts import HazardSeverity, WarningAlert
from app.schemas.common import Coordinates
from app.schemas.destinations import CandidatePlace
from app.schemas.itinerary import Activity, ActivityCategory, UserPreferences
from app.services.incident_search import haversine_distance_km

logger = logging.getLogger("safehaven.alternative_ranker")

# Category similarity lookup matrix
CATEGORY_SIMILARITY: Dict[Tuple[ActivityCategory, ActivityCategory], float] = {
    # Outdoor Hiking
    (ActivityCategory.OUTDOOR_HIKING, ActivityCategory.OUTDOOR_HIKING): 1.0,
    (ActivityCategory.OUTDOOR_HIKING, ActivityCategory.NATURE_WILDLIFE): 0.85,
    (ActivityCategory.OUTDOOR_HIKING, ActivityCategory.OUTDOOR_SIGHTSEEING): 0.70,
    (ActivityCategory.OUTDOOR_HIKING, ActivityCategory.INDOOR_MUSEUM): 0.40,
    # Outdoor Beach
    (ActivityCategory.OUTDOOR_BEACH, ActivityCategory.OUTDOOR_BEACH): 1.0,
    (ActivityCategory.OUTDOOR_BEACH, ActivityCategory.OUTDOOR_SIGHTSEEING): 0.70,
    (ActivityCategory.OUTDOOR_BEACH, ActivityCategory.INDOOR_MUSEUM): 0.45,
    (ActivityCategory.OUTDOOR_BEACH, ActivityCategory.INDOOR_DINING): 0.40,
    # Nature Wildlife
    (ActivityCategory.NATURE_WILDLIFE, ActivityCategory.NATURE_WILDLIFE): 1.0,
    (ActivityCategory.NATURE_WILDLIFE, ActivityCategory.OUTDOOR_HIKING): 0.85,
    (ActivityCategory.NATURE_WILDLIFE, ActivityCategory.OUTDOOR_SIGHTSEEING): 0.75,
    (ActivityCategory.NATURE_WILDLIFE, ActivityCategory.INDOOR_MUSEUM): 0.50,
    # Cultural Heritage
    (ActivityCategory.CULTURAL_HERITAGE, ActivityCategory.CULTURAL_HERITAGE): 1.0,
    (ActivityCategory.CULTURAL_HERITAGE, ActivityCategory.INDOOR_MUSEUM): 0.90,
    (ActivityCategory.CULTURAL_HERITAGE, ActivityCategory.INDOOR_CULTURAL): 0.90,
    (ActivityCategory.CULTURAL_HERITAGE, ActivityCategory.OUTDOOR_SIGHTSEEING): 0.80,
    # Outdoor Sightseeing
    (ActivityCategory.OUTDOOR_SIGHTSEEING, ActivityCategory.OUTDOOR_SIGHTSEEING): 1.0,
    (ActivityCategory.OUTDOOR_SIGHTSEEING, ActivityCategory.CULTURAL_HERITAGE): 0.80,
    (ActivityCategory.OUTDOOR_SIGHTSEEING, ActivityCategory.INDOOR_MUSEUM): 0.65,
    (ActivityCategory.OUTDOOR_SIGHTSEEING, ActivityCategory.NATURE_WILDLIFE): 0.75,
    # Indoor Museum
    (ActivityCategory.INDOOR_MUSEUM, ActivityCategory.INDOOR_MUSEUM): 1.0,
    (ActivityCategory.INDOOR_MUSEUM, ActivityCategory.INDOOR_CULTURAL): 0.95,
    (ActivityCategory.INDOOR_MUSEUM, ActivityCategory.CULTURAL_HERITAGE): 0.90,
    # Indoor Dining
    (ActivityCategory.INDOOR_DINING, ActivityCategory.INDOOR_DINING): 1.0,
}


class AlternativeRanker:
    def __init__(
        self,
        weight_similarity: float = settings.WEIGHT_SIMILARITY,
        weight_distance: float = settings.WEIGHT_DISTANCE,
        weight_feasibility: float = settings.WEIGHT_FEASIBILITY,
    ):
        total = weight_similarity + weight_distance + weight_feasibility
        self.ws = weight_similarity / total
        self.wd = weight_distance / total
        self.wf = weight_feasibility / total

    def compute_similarity(
        self,
        orig_category: ActivityCategory,
        cand_category: ActivityCategory,
        is_weather_hazard: bool = False,
    ) -> float:
        if orig_category == cand_category:
            return 1.0

        score = CATEGORY_SIMILARITY.get((orig_category, cand_category))
        if score is None:
            score = CATEGORY_SIMILARITY.get((cand_category, orig_category), 0.35)

        # If weather hazard is active and candidate is sheltered indoor, boost suitability
        if is_weather_hazard and cand_category in [
            ActivityCategory.INDOOR_MUSEUM,
            ActivityCategory.INDOOR_CULTURAL,
            ActivityCategory.INDOOR_DINING,
        ]:
            score = max(score, 0.80)

        return round(score, 2)

    def filter_and_rank_alternatives(
        self,
        original_activity: Activity,
        candidates: List[CandidatePlace],
        all_alerts: List[WarningAlert],
        user_preferences: Optional[UserPreferences] = None,
        is_weather_hazard: bool = False,
        search_radius_km: float = 25.0,
    ) -> Tuple[List[CandidatePlace], List[CandidatePlace]]:
        """
        1. Filters out candidates affected by active hazard zones or mandatory closures.
        2. Ranks remaining eligible candidates using S(a) = ws*Similarity + wd*Distance + wf*Feasibility.
        Returns: (ranked_eligible_candidates, filtered_ineligible_candidates)
        """
        user_prefs = user_preferences or UserPreferences()
        eligible: List[CandidatePlace] = []
        filtered: List[CandidatePlace] = []

        for cand in candidates:
            # 1. Risk Eligibility Check
            is_in_hazard_zone = False
            filter_reason = None

            for alert in all_alerts:
                # Check spatial conflict
                if alert.coordinates is not None:
                    dist_to_hazard = haversine_distance_km(cand.coordinates, alert.coordinates)
                    hazard_radius = alert.radius_km or 20.0
                    if dist_to_hazard <= hazard_radius:
                        is_in_hazard_zone = True
                        filter_reason = (
                            f"Location falls within {hazard_radius}km hazard zone of {alert.title} "
                            f"(severity: {alert.severity.value})"
                        )
                        break

                elif alert.is_mandatory_override:
                    # If whole region or specific route is closed
                    if original_activity.location_name.lower() in alert.geographic_coverage.lower():
                        # Verify candidate isn't in same closed zone
                        if cand.distance_km < 10.0:
                            is_in_hazard_zone = True
                            filter_reason = f"Candidate is in region under authoritative closure: {alert.title}"
                            break

            if is_in_hazard_zone:
                cand.is_risk_filtered = True
                cand.filter_reason = filter_reason
                cand.risk_evidence_coverage = "excluded_hazard_overlap"
                filtered.append(cand)
                continue

            # 2. Similarity Score
            sim_score = self.compute_similarity(
                original_activity.category, cand.category, is_weather_hazard=is_weather_hazard
            )

            # 3. Distance Score
            effective_max_dist = max(search_radius_km, user_prefs.max_alternative_distance_km)
            dist_score = max(0.0, 1.0 - (cand.distance_km / effective_max_dist))

            # 4. Feasibility Score
            feasibility = 1.0
            if user_prefs.accessibility_required:
                wheelchair = cand.tags.get("wheelchair", "").lower()
                if wheelchair in ["no", "limited"]:
                    feasibility -= 0.5
                elif wheelchair == "yes":
                    feasibility = 1.0
                else:
                    feasibility -= 0.1  # Slight penalty for unverified accessibility

            cand.similarity_score = round(sim_score, 2)
            cand.distance_score = round(dist_score, 2)
            cand.feasibility_score = round(feasibility, 2)

            # Composite Score S(a)
            composite = (self.ws * sim_score) + (self.wd * dist_score) + (self.wf * feasibility)
            cand.composite_score = round(composite, 2)
            cand.risk_evidence_coverage = "verified_outside_active_hazard_zones"

            explanation = (
                f"Ranked #{len(eligible)+1}: Experience similarity {int(sim_score*100)}% "
                f"({cand.category.value}), {cand.distance_km:.1f} km from original ({int(dist_score*100)}% proximity score), "
                f"feasibility {int(feasibility*100)}%."
            )
            cand.ranking_explanation = explanation
            eligible.append(cand)

        # Sort eligible descending by composite score
        eligible.sort(key=lambda c: c.composite_score, reverse=True)

        return eligible, filtered


alternative_ranker = AlternativeRanker()
