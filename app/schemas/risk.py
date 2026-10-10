from datetime import date, datetime, timezone
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus
from app.schemas.common import Coordinates, SourceStatus, UncertaintyInfo
from app.schemas.itinerary import Activity, UserPreferences


class RiskCategory(str, Enum):
    LOW = "low"  # 0 - 24
    CAUTION = "caution"  # 25 - 49
    HIGH_CONCERN = "high_concern"  # 50 - 74
    VERY_HIGH_CONCERN = "very_high_concern"  # 75 - 100


class ActionRecommendation(str, Enum):
    KEEP = "keep"
    MODIFY = "modify"
    DELAY = "delay"
    AVOID = "avoid"


class RiskScoreBreakdown(BaseModel):
    hazard_severity: float = Field(..., ge=0.0, le=1.0, description="H component")
    geographic_relevance: float = Field(..., ge=0.0, le=1.0, description="P component")
    temporal_overlap: float = Field(..., ge=0.0, le=1.0, description="T component")
    confidence: float = Field(..., ge=0.0, le=1.0, description="C component")
    calculated_score: float = Field(..., ge=0.0, le=100.0)
    formula: str = "100 * (0.35H + 0.25P + 0.25T + 0.15C)"
    weights: Dict[str, float]


class EvidenceItem(BaseModel):
    id: str
    source_name: str
    source_url: Optional[str] = None
    headline: str
    details: str
    published_at: datetime
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    hazard_category: HazardCategory
    severity: HazardSeverity
    distance_km: Optional[float] = None
    temporal_overlap_hours: Optional[float] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    verification_status: VerificationStatus


class MandatoryOverride(BaseModel):
    active: bool
    reason: str
    rule: str
    source_id: Optional[str] = None


class ActivityRiskAssessment(BaseModel):
    activity_id: str
    activity_title: str
    risk_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    risk_category: RiskCategory
    recommendation: ActionRecommendation
    recommended_action: str
    components: RiskScoreBreakdown
    mandatory_overrides: List[MandatoryOverride] = Field(default_factory=list)
    relevant_hazards: List[str] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    data_freshness_seconds: Optional[int] = None
    uncertainty: UncertaintyInfo
    replanning_needed: bool


class ItineraryRiskSummary(BaseModel):
    total_activities: int
    activities_at_risk: int
    highest_risk_category: RiskCategory
    overall_recommendation: ActionRecommendation
    activity_assessments: List[ActivityRiskAssessment]
    source_statuses: List[SourceStatus]


class RiskAssessmentRequest(BaseModel):
    itinerary_id: Optional[str] = None
    destination_name: str = Field(..., min_length=1, max_length=200)
    destination_coordinates: Coordinates
    start_date: date
    end_date: date
    activities: List[Activity] = Field(..., min_length=1, max_length=50)
    user_preferences: Optional[UserPreferences] = Field(default_factory=UserPreferences)


class RiskAssessmentResponse(BaseModel):
    itinerary_id: Optional[str] = None
    assessed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    summary: ItineraryRiskSummary
