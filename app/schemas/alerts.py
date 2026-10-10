from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import Coordinates, PaginationMeta


class HazardCategory(str, Enum):
    SEVERE_WEATHER = "severe_weather"
    FLOOD = "flood"
    LANDSLIDE = "landslide"
    WILDFIRE = "wildfire"
    EARTHQUAKE = "earthquake"
    ROAD_CLOSURE = "road_closure"
    WILDLIFE = "wildlife"
    TRANSPORT_DISRUPTION = "transport_disruption"
    EVACUATION_ORDER = "evacuation_order"
    OTHER = "other"


class HazardSeverity(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"


class VerificationStatus(str, Enum):
    OFFICIAL = "official"
    CREDIBLE_REPORTED = "credible_reported"
    UNVERIFIED = "unverified"
    HISTORICAL = "historical"


class WarningAlert(BaseModel):
    id: str = Field(..., description="Unique alert identifier")
    source_org: str = Field(..., description="Authoritative issuing body or reporting entity")
    original_url: Optional[str] = Field(None, description="Direct URL to official bulletin or report")
    published_at: datetime = Field(..., description="Original publication timestamp")
    updated_at: Optional[datetime] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    hazard_category: HazardCategory
    severity: HazardSeverity
    title: str = Field(..., description="Summary headline")
    original_text: str = Field(..., description="Complete verbatim text of the warning")
    language: str = Field("en", description="Original language code ISO 639-1")
    geographic_coverage: str = Field(..., description="Textual description of affected geographic bounds")
    coordinates: Optional[Coordinates] = None
    radius_km: Optional[float] = Field(None, ge=0.0)
    is_mandatory_override: bool = Field(False, description="True if alert mandates route closure or evacuation")
    verification_status: VerificationStatus = Field(VerificationStatus.OFFICIAL)
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AlertsResponse(BaseModel):
    items: List[WarningAlert]
    pagination: PaginationMeta
