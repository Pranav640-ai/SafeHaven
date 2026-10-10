from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import Coordinates, SourceStatus
from app.schemas.itinerary import ActivityCategory


class CandidatePlace(BaseModel):
    id: str
    name: str
    coordinates: Coordinates
    category: ActivityCategory
    osm_id: Optional[str] = None
    osm_type: Optional[str] = None
    tags: Dict[str, str] = Field(default_factory=dict)
    source_url: Optional[str] = None
    distance_km: float = Field(..., ge=0.0)
    travel_time_minutes: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    similarity_score: float = Field(0.0, ge=0.0, le=1.0)
    distance_score: float = Field(0.0, ge=0.0, le=1.0)
    feasibility_score: float = Field(0.0, ge=0.0, le=1.0)
    composite_score: float = Field(0.0, ge=0.0, le=1.0)
    risk_evidence_coverage: str = Field("checked_no_active_restrictions")
    is_risk_filtered: bool = False
    filter_reason: Optional[str] = None
    ranking_explanation: str
    information_gaps: List[str] = Field(default_factory=list)


class NearbyDestinationsRequest(BaseModel):
    origin_coordinates: Coordinates
    activity_category: ActivityCategory
    search_radius_km: float = Field(10.0, ge=1.0, le=100.0)
    prefer_indoor: bool = False
    limit: int = Field(10, ge=1, le=50)


class NearbyDestinationsResponse(BaseModel):
    origin_coordinates: Coordinates
    search_radius_km: float
    total_candidates_found: int
    candidates: List[CandidatePlace]
    source_status: SourceStatus
