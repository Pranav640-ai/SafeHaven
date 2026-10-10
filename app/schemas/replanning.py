from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.destinations import CandidatePlace
from app.schemas.itinerary import Activity, Itinerary
from app.schemas.risk import ItineraryRiskSummary


class ActivityChangeType(str, Enum):
    UNCHANGED = "unchanged"
    MODIFIED = "modified"
    DELAYED = "delayed"
    CANCELLED = "cancelled"


class RevisedActivityRecord(BaseModel):
    original_activity_id: str
    change_type: ActivityChangeType
    revised_activity: Optional[Activity] = None
    reason_for_change: str
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    similarity_justification: Optional[str] = None
    selected_candidate_id: Optional[str] = None
    distance_from_original_km: Optional[float] = None
    remaining_uncertainty: str


class TripReplanRequest(BaseModel):
    itinerary: Itinerary
    force_deterministic: bool = Field(False, description="Bypass LLM and force deterministic replanner")


class TripReplanResponse(BaseModel):
    original_itinerary: Itinerary
    revised_itinerary: Itinerary
    changed_activities: List[RevisedActivityRecord]
    risk_summary: ItineraryRiskSummary
    alternatives_considered: List[CandidatePlace] = Field(default_factory=list)
    replanner_mode: str = Field("llm_generated", description="llm_generated or deterministic_fallback")
    validation_status: str = Field("validated_ok")
    uncertainties: List[str] = Field(default_factory=list)
