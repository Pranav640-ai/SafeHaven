import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple

from app.config import settings
from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from app.schemas.common import Coordinates, SourceStatus, UncertaintyInfo
from app.schemas.itinerary import Activity, ActivityCategory, Itinerary, UserPreferences
from app.schemas.risk import (
    ActionRecommendation,
    ActivityRiskAssessment,
    EvidenceItem,
    ItineraryRiskSummary,
    MandatoryOverride,
    RiskCategory,
    RiskScoreBreakdown,
)
from app.services.incident_search import incident_search_service, haversine_distance_km
from app.services.weather import weather_service, WeatherWindowAnalysis
from app.services.warning_sources import warning_aggregator

logger = logging.getLogger("safehaven.risk_engine")

SEVERITY_SCORES = {
    HazardSeverity.EXTREME: 1.0,
    HazardSeverity.SEVERE: 0.8,
    HazardSeverity.MODERATE: 0.5,
    HazardSeverity.LOW: 0.2,
}

VERIFICATION_CONFIDENCE = {
    VerificationStatus.OFFICIAL: 1.0,
    VerificationStatus.CREDIBLE_REPORTED: 0.75,
    VerificationStatus.UNVERIFIED: 0.40,
    VerificationStatus.HISTORICAL: 0.30,
}


class RiskEngine:
    def __init__(
        self,
        weight_h: float = settings.WEIGHT_HAZARD,
        weight_p: float = settings.WEIGHT_PROXIMITY,
        weight_t: float = settings.WEIGHT_TEMPORAL,
        weight_c: float = settings.WEIGHT_CONFIDENCE,
    ):
        # Normalize weights if sum != 1.0
        total_w = weight_h + weight_p + weight_t + weight_c
        self.w_h = weight_h / total_w
        self.w_p = weight_p / total_w
        self.w_t = weight_t / total_w
        self.w_c = weight_c / total_w

    def calculate_score(self, h: float, p: float, t: float, c: float) -> float:
        """
        R = 100 * (0.35H + 0.25P + 0.25T + 0.15C)
        All components normalized to [0, 1].
        """
        score = 100.0 * (self.w_h * h + self.w_p * p + self.w_t * t + self.w_c * c)
        return max(0.0, min(100.0, round(score, 1)))

    def categorize_score(self, score: float) -> RiskCategory:
        if score < 25.0:
            return RiskCategory.LOW
        elif score < 50.0:
            return RiskCategory.CAUTION
        elif score < 75.0:
            return RiskCategory.HIGH_CONCERN
        else:
            return RiskCategory.VERY_HIGH_CONCERN

    def is_outdoor_activity(self, category: ActivityCategory) -> bool:
        return category in [
            ActivityCategory.OUTDOOR_HIKING,
            ActivityCategory.OUTDOOR_BEACH,
            ActivityCategory.NATURE_WILDLIFE,
            ActivityCategory.OUTDOOR_SIGHTSEEING,
            ActivityCategory.OTHER_OUTDOOR,
        ]

    async def assess_activity(
        self,
        activity: Activity,
        destination_name: str,
        destination_coords: Coordinates,
        all_alerts: List[WarningAlert],
        forecast_data: Optional[Dict],
        source_failures: List[str],
    ) -> ActivityRiskAssessment:
        activity_coords = activity.coordinates or destination_coords
        evidence_items: List[EvidenceItem] = []
        mandatory_overrides: List[MandatoryOverride] = []
        hazards_identified: List[str] = []

        max_h = 0.0
        max_p = 0.0
        max_t = 0.0
        max_c = 0.0

        # 1. Weather Evaluation
        weather_analysis: WeatherWindowAnalysis = weather_service.evaluate_activity_weather(
            forecast_data, activity.start_time, activity.end_time
        )

        is_outdoor = self.is_outdoor_activity(activity.category)

        if weather_analysis.available and weather_analysis.hazard_identified:
            w_sev = weather_analysis.hazard_severity or HazardSeverity.LOW
            w_h = SEVERITY_SCORES.get(w_sev, 0.2)
            # If indoor activity, weather impact is mitigated unless severe/extreme flooding/storm
            if not is_outdoor and w_sev in [HazardSeverity.LOW, HazardSeverity.MODERATE]:
                w_h *= 0.3

            w_p = 1.0  # Point forecast evaluated at target coords
            w_t = 1.0  # Directly within hourly activity window
            w_c = 0.85  # Open-Meteo deterministic forecast confidence

            if w_h > max_h:
                max_h = w_h
            if w_p > max_p:
                max_p = w_p
            if w_t > max_t:
                max_t = w_t
            if w_c > max_c:
                max_c = w_c

            hazards_identified.append(f"Weather: {weather_analysis.hazard_details}")
            evidence_items.append(
                EvidenceItem(
                    id=f"weather_{activity.id}",
                    source_name="Open-Meteo Forecast",
                    source_url="https://open-meteo.com",
                    headline=f"Weather hazard during activity: {weather_analysis.weather_condition_text}",
                    details=weather_analysis.hazard_details or "Adverse weather forecast",
                    published_at=datetime.now(timezone.utc),
                    valid_from=activity.start_time,
                    valid_until=activity.end_time,
                    hazard_category=weather_analysis.hazard_category or HazardCategory.SEVERE_WEATHER,
                    severity=w_sev,
                    distance_km=0.0,
                    temporal_overlap_hours=float(activity.duration_minutes or 60) / 60.0,
                    confidence=0.85,
                    verification_status=VerificationStatus.OFFICIAL,
                )
            )

        # 2. Alerts and Incident Intelligence Matching
        relevant_alerts = incident_search_service.filter_and_rank_incidents(
            all_alerts,
            activity_coords,
            destination_name,
            activity.start_time,
            activity.end_time,
            max_distance_km=50.0,
        )

        for alert, p_score, dist_km, overlap_hours in relevant_alerts:
            h_score = SEVERITY_SCORES.get(alert.severity, 0.5)
            # Temporal score based on overlap hours vs activity duration
            act_dur_hours = max(1.0, float(activity.duration_minutes or 60) / 60.0)
            t_score = min(1.0, max(0.2, overlap_hours / act_dur_hours))
            c_score = VERIFICATION_CONFIDENCE.get(alert.verification_status, 0.5)

            # Check for mandatory override
            if alert.is_mandatory_override or alert.hazard_category == HazardCategory.EVACUATION_ORDER:
                mandatory_overrides.append(
                    MandatoryOverride(
                        active=True,
                        reason=f"Authoritative restriction: {alert.title}",
                        rule=f"Mandatory restriction by {alert.source_org}",
                        source_id=alert.id,
                    )
                )

            if h_score > max_h:
                max_h = h_score
            if p_score > max_p:
                max_p = p_score
            if t_score > max_t:
                max_t = t_score
            if c_score > max_c:
                max_c = c_score

            hazards_identified.append(f"{alert.hazard_category.value.title()}: {alert.title}")
            evidence_items.append(
                EvidenceItem(
                    id=alert.id,
                    source_name=alert.source_org,
                    source_url=alert.original_url,
                    headline=alert.title,
                    details=alert.original_text,
                    published_at=alert.published_at,
                    valid_from=alert.valid_from,
                    valid_until=alert.valid_until,
                    hazard_category=alert.hazard_category,
                    severity=alert.severity,
                    distance_km=dist_km,
                    temporal_overlap_hours=round(overlap_hours, 1),
                    confidence=c_score,
                    verification_status=alert.verification_status,
                )
            )

        # 3. Calculate Risk Score & Breakdown
        raw_score = self.calculate_score(max_h, max_p, max_t, max_c)
        score_breakdown = RiskScoreBreakdown(
            hazard_severity=round(max_h, 2),
            geographic_relevance=round(max_p, 2),
            temporal_overlap=round(max_t, 2),
            confidence=round(max_c, 2),
            calculated_score=raw_score,
            weights={
                "hazard_severity": round(self.w_h, 2),
                "geographic_relevance": round(self.w_p, 2),
                "temporal_overlap": round(self.w_t, 2),
                "confidence": round(self.w_c, 2),
            },
        )

        # Apply mandatory overrides if active
        if mandatory_overrides:
            final_score = max(95.0, raw_score)
            risk_category = RiskCategory.VERY_HIGH_CONCERN
            recommendation = ActionRecommendation.AVOID
            recommended_action = (
                f"Authoritative closure or evacuation active ({mandatory_overrides[0].reason}). Do not attempt. Seek safe alternative."
            )
            replanning_needed = True
        else:
            final_score = raw_score
            risk_category = self.categorize_score(final_score)

            if risk_category == RiskCategory.VERY_HIGH_CONCERN:
                recommendation = ActionRecommendation.AVOID
                recommended_action = "Severe hazard detected. Avoid activity and relocate to a secure location."
                replanning_needed = True
            elif risk_category == RiskCategory.HIGH_CONCERN:
                recommendation = ActionRecommendation.MODIFY
                recommended_action = "Substantial travel hazard detected. Recommend switching to a safe nearby alternative."
                replanning_needed = True
            elif risk_category == RiskCategory.CAUTION:
                if is_outdoor and weather_analysis.precipitation_sum_mm and weather_analysis.precipitation_sum_mm > 5:
                    recommendation = ActionRecommendation.DELAY
                    recommended_action = "Adverse weather forecast. Consider delaying schedule or selecting indoor options."
                    replanning_needed = True
                else:
                    recommendation = ActionRecommendation.KEEP
                    recommended_action = "Minor hazard or caution indicated. Proceed with vigilant awareness and monitor local reports."
                    replanning_needed = False
            else:
                recommendation = ActionRecommendation.KEEP
                recommended_action = "No significant risk identified. Proceed as planned."
                replanning_needed = False

        # Build uncertainty profile
        uncertainty_level = "low"
        uncertainty_desc = "Sufficient spatial and temporal evidence available."
        missing_vars = []

        if not weather_analysis.available:
            uncertainty_level = "moderate"
            uncertainty_desc = weather_analysis.uncertainty.description
            missing_vars.extend(weather_analysis.uncertainty.missing_variables)

        if source_failures:
            uncertainty_level = "moderate" if uncertainty_level == "low" else "high"
            uncertainty_desc += f" Note: external source failures occurred: {', '.join(source_failures)}."
            missing_vars.extend(source_failures)

        uncertainty_info = UncertaintyInfo(
            level=uncertainty_level,
            description=uncertainty_desc,
            missing_variables=missing_vars,
            confidence_score=max(0.2, 1.0 - (len(missing_vars) * 0.2)),
        )

        return ActivityRiskAssessment(
            activity_id=activity.id,
            activity_title=activity.title,
            risk_score=final_score,
            risk_category=risk_category,
            recommendation=recommendation,
            recommended_action=recommended_action,
            components=score_breakdown,
            mandatory_overrides=mandatory_overrides,
            relevant_hazards=hazards_identified,
            evidence=evidence_items,
            data_freshness_seconds=weather_analysis.data_freshness_seconds,
            uncertainty=uncertainty_info,
            replanning_needed=replanning_needed,
        )

    async def assess_itinerary(self, itinerary: Itinerary) -> ItineraryRiskSummary:
        """
        End-to-end deterministic evaluation of an entire itinerary.
        """
        # Fetch weather forecast for destination coordinates
        forecast_data, weather_status = await weather_service.fetch_forecast(
            itinerary.destination_coordinates
        )

        # Fetch warnings from all configured adapters
        all_alerts, warning_statuses = await warning_aggregator.fetch_all_warnings()

        all_source_statuses: List[SourceStatus] = [weather_status] + warning_statuses
        source_failures = [s.source_name for s in all_source_statuses if s.status == "failed"]

        activity_assessments: List[ActivityRiskAssessment] = []
        for activity in itinerary.activities:
            assessment = await self.assess_activity(
                activity=activity,
                destination_name=itinerary.destination_name,
                destination_coords=itinerary.destination_coordinates,
                all_alerts=all_alerts,
                forecast_data=forecast_data,
                source_failures=source_failures,
            )
            activity_assessments.append(assessment)

        # Summarize itinerary
        total = len(activity_assessments)
        at_risk_count = sum(1 for a in activity_assessments if a.replanning_needed)

        categories = [a.risk_category for a in activity_assessments]
        if RiskCategory.VERY_HIGH_CONCERN in categories:
            highest_category = RiskCategory.VERY_HIGH_CONCERN
            overall_rec = ActionRecommendation.AVOID
        elif RiskCategory.HIGH_CONCERN in categories:
            highest_category = RiskCategory.HIGH_CONCERN
            overall_rec = ActionRecommendation.MODIFY
        elif RiskCategory.CAUTION in categories:
            highest_category = RiskCategory.CAUTION
            overall_rec = ActionRecommendation.DELAY if at_risk_count > 0 else ActionRecommendation.KEEP
        else:
            highest_category = RiskCategory.LOW
            overall_rec = ActionRecommendation.KEEP

        return ItineraryRiskSummary(
            total_activities=total,
            activities_at_risk=at_risk_count,
            highest_risk_category=highest_category,
            overall_recommendation=overall_rec,
            activity_assessments=activity_assessments,
            source_statuses=all_source_statuses,
        )


risk_engine = RiskEngine()
