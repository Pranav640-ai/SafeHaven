from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator
from backend.intelligence.schemas.common import Coordinates


class ActivityCategory(str, Enum):
    OUTDOOR_HIKING = "outdoor_hiking"
    OUTDOOR_BEACH = "outdoor_beach"
    NATURE_WILDLIFE = "nature_wildlife"
    CULTURAL_HERITAGE = "cultural_heritage"
    OUTDOOR_SIGHTSEEING = "outdoor_sightseeing"
    INDOOR_MUSEUM = "indoor_museum"
    INDOOR_CULTURAL = "indoor_cultural"
    INDOOR_DINING = "indoor_dining"
    ENTERTAINMENT = "entertainment"
    TRANSIT = "transit"
    OTHER_OUTDOOR = "other_outdoor"
    OTHER_INDOOR = "other_indoor"


class Activity(BaseModel):
    id: str = Field(..., description="Unique identifier for the activity within the itinerary")
    title: str = Field(..., min_length=1, max_length=200, description="Name or title of the planned activity")
    category: ActivityCategory = Field(..., description="Standardized category of the activity")
    location_name: str = Field(..., min_length=1, max_length=250, description="Descriptive location name")
    coordinates: Optional[Coordinates] = Field(None, description="Precise activity coordinates")
    start_time: datetime = Field(..., description="Scheduled start time with ISO timestamp")
    end_time: datetime = Field(..., description="Scheduled end time with ISO timestamp")
    duration_minutes: Optional[int] = Field(None, ge=5, le=1440, description="Duration in minutes")
    is_fixed: bool = Field(False, description="Whether activity has fixed non-negotiable booking/timing")
    budget: Optional[float] = Field(None, ge=0.0, description="Estimated budget or cost")
    accessibility_needs: Optional[List[str]] = Field(default_factory=list, description="Accessibility flags")
    notes: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_times(self) -> "Activity":
        if self.end_time <= self.start_time:
            raise ValueError(f"Activity end_time ({self.end_time}) must be after start_time ({self.start_time})")
        if self.duration_minutes is None:
            self.duration_minutes = int((self.end_time - self.start_time).total_seconds() / 60)
        return self


class UserPreferences(BaseModel):
    accessibility_required: bool = False
    max_alternative_distance_km: float = Field(25.0, ge=1.0, le=100.0)
    prefer_indoor_on_weather_risk: bool = True
    interests: List[str] = Field(default_factory=list)
    budget_limit: Optional[float] = None


class Itinerary(BaseModel):
    id: Optional[str] = Field(None, description="Optional itinerary tracking identifier")
    destination_name: str = Field(..., min_length=1, max_length=200, description="Primary destination area or city")
    destination_coordinates: Coordinates = Field(..., description="Coordinates of destination region/city centre")
    start_date: date = Field(..., description="Travel start date")
    end_date: date = Field(..., description="Travel end date")
    activities: List[Activity] = Field(..., min_length=1, max_length=50, description="List of planned activities")
    user_preferences: Optional[UserPreferences] = Field(default_factory=UserPreferences)

    @model_validator(mode="after")
    def validate_dates_and_activities(self) -> "Itinerary":
        if self.end_date < self.start_date:
            raise ValueError(f"end_date ({self.end_date}) cannot be before start_date ({self.start_date})")
        return self
