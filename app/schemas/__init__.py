from app.schemas.common import Coordinates, SourceStatus, UncertaintyInfo, PaginationMeta
from app.schemas.itinerary import Activity, ActivityCategory, Itinerary, UserPreferences
from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert, AlertsResponse
from app.schemas.risk import (
    RiskCategory,
    ActionRecommendation,
    RiskScoreBreakdown,
    EvidenceItem,
    MandatoryOverride,
    ActivityRiskAssessment,
    ItineraryRiskSummary,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
)
from app.schemas.destinations import CandidatePlace, NearbyDestinationsRequest, NearbyDestinationsResponse
from app.schemas.replanning import ActivityChangeType, RevisedActivityRecord, TripReplanRequest, TripReplanResponse
from app.schemas.guidance import ExplainWarningRequest, EmergencyGuidanceResponse

__all__ = [
    "Coordinates",
    "SourceStatus",
    "UncertaintyInfo",
    "PaginationMeta",
    "Activity",
    "ActivityCategory",
    "Itinerary",
    "UserPreferences",
    "HazardCategory",
    "HazardSeverity",
    "VerificationStatus",
    "WarningAlert",
    "AlertsResponse",
    "RiskCategory",
    "ActionRecommendation",
    "RiskScoreBreakdown",
    "EvidenceItem",
    "MandatoryOverride",
    "ActivityRiskAssessment",
    "ItineraryRiskSummary",
    "RiskAssessmentRequest",
    "RiskAssessmentResponse",
    "CandidatePlace",
    "NearbyDestinationsRequest",
    "NearbyDestinationsResponse",
    "ActivityChangeType",
    "RevisedActivityRecord",
    "TripReplanRequest",
    "TripReplanResponse",
    "ExplainWarningRequest",
    "EmergencyGuidanceResponse",
]
