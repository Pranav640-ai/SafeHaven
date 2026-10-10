from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator


class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")


class SourceStatus(BaseModel):
    source_name: str
    status: str = Field(..., description="ok, degraded, failed, cached, skipped")
    latency_ms: Optional[float] = None
    records_count: int = 0
    message: Optional[str] = None
    last_fetched_at: Optional[datetime] = None


class UncertaintyInfo(BaseModel):
    level: str = Field("low", description="low, moderate, high, unresolved")
    description: str
    missing_variables: List[str] = Field(default_factory=list)
    confidence_score: float = Field(1.0, ge=0.0, le=1.0)


class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
