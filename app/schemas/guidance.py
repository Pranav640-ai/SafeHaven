from typing import List, Optional
from pydantic import BaseModel, Field


class ExplainWarningRequest(BaseModel):
    alert_id: Optional[str] = None
    raw_warning_text: Optional[str] = Field(None, max_length=5000)
    source_org: Optional[str] = Field(None, max_length=200)
    target_language: str = Field("es", min_length=2, max_length=10, description="ISO language code like es, fr, de, hi, ja, zh")


class EmergencyGuidanceResponse(BaseModel):
    alert_id: Optional[str] = None
    original_warning: str
    source_organization: str
    source_url: Optional[str] = None
    published_at: Optional[str] = None
    validity_period: Optional[str] = None
    simplified_explanation: str
    target_language: str
    translated_explanation: str
    recommended_actions: List[str]
    emergency_contacts: List[str]
    verification_status: str
    remaining_uncertainty: str
