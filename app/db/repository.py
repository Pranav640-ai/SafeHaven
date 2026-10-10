import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings
from app.schemas.itinerary import Itinerary
from app.schemas.risk import RiskAssessmentResponse
from app.schemas.replanning import TripReplanResponse

logger = logging.getLogger("safehaven.db")


class BaseRepository(ABC):
    @abstractmethod
    async def save_itinerary(self, itinerary: Itinerary) -> str:
        pass

    @abstractmethod
    async def get_itinerary(self, itinerary_id: str) -> Optional[Itinerary]:
        pass

    @abstractmethod
    async def save_risk_assessment(self, itinerary_id: str, assessment: RiskAssessmentResponse) -> None:
        pass

    @abstractmethod
    async def get_risk_assessment(self, itinerary_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def save_replan_proposal(self, itinerary_id: str, proposal: TripReplanResponse) -> None:
        pass

    @abstractmethod
    async def save_user_feedback(self, itinerary_id: str, feedback: Dict[str, Any]) -> None:
        pass


class InMemoryRepository(BaseRepository):
    """
    In-memory repository used for local development, tests, and when Supabase is not configured.
    """
    def __init__(self):
        self.itineraries: Dict[str, Itinerary] = {}
        self.risk_assessments: Dict[str, Dict[str, Any]] = {}
        self.replan_proposals: Dict[str, Dict[str, Any]] = {}
        self.feedbacks: List[Dict[str, Any]] = []

    async def save_itinerary(self, itinerary: Itinerary) -> str:
        itin_id = itinerary.id or f"itin_{len(self.itineraries)+1}"
        itinerary.id = itin_id
        self.itineraries[itin_id] = itinerary
        return itin_id

    async def get_itinerary(self, itinerary_id: str) -> Optional[Itinerary]:
        return self.itineraries.get(itinerary_id)

    async def save_risk_assessment(self, itinerary_id: str, assessment: RiskAssessmentResponse) -> None:
        self.risk_assessments[itinerary_id] = assessment.model_dump(mode="json")

    async def get_risk_assessment(self, itinerary_id: str) -> Optional[Dict[str, Any]]:
        return self.risk_assessments.get(itinerary_id)

    async def save_replan_proposal(self, itinerary_id: str, proposal: TripReplanResponse) -> None:
        self.replan_proposals[itinerary_id] = proposal.model_dump(mode="json")

    async def save_user_feedback(self, itinerary_id: str, feedback: Dict[str, Any]) -> None:
        record = {
            "itinerary_id": itinerary_id,
            "feedback": feedback,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.feedbacks.append(record)


class SupabaseRepository(BaseRepository):
    """
    Production-ready Supabase PostgreSQL repository interacting via PostgREST endpoints.
    Requires SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
    """
    def __init__(self, supabase_url: str, api_key: str):
        self.base_url = f"{supabase_url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def save_itinerary(self, itinerary: Itinerary) -> str:
        itin_id = itinerary.id or f"itin_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        itinerary.id = itin_id
        payload = {
            "id": itin_id,
            "destination_name": itinerary.destination_name,
            "destination_lat": itinerary.destination_coordinates.latitude,
            "destination_lon": itinerary.destination_coordinates.longitude,
            "start_date": itinerary.start_date.isoformat(),
            "end_date": itinerary.end_date.isoformat(),
            "payload": itinerary.model_dump(mode="json"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{self.base_url}/itineraries",
                json=payload,
                headers=self.headers,
            )
            resp.raise_for_status()
        return itin_id

    async def get_itinerary(self, itinerary_id: str) -> Optional[Itinerary]:
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                f"{self.base_url}/itineraries",
                params={"id": f"eq.{itinerary_id}"},
                headers=self.headers,
            )
            resp.raise_for_status()
            data = resp.json()
            if data and len(data) > 0:
                return Itinerary(**data[0]["payload"])
        return None

    async def save_risk_assessment(self, itinerary_id: str, assessment: RiskAssessmentResponse) -> None:
        payload = {
            "itinerary_id": itinerary_id,
            "assessment_data": assessment.model_dump(mode="json"),
            "highest_risk": assessment.summary.highest_risk_category.value,
            "assessed_at": assessment.assessed_at.isoformat(),
        }
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{self.base_url}/risk_assessments",
                json=payload,
                headers=self.headers,
            )
            resp.raise_for_status()

    async def get_risk_assessment(self, itinerary_id: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                f"{self.base_url}/risk_assessments",
                params={"itinerary_id": f"eq.{itinerary_id}"},
                headers=self.headers,
            )
            resp.raise_for_status()
            data = resp.json()
            if data and len(data) > 0:
                return data[0]["assessment_data"]
        return None

    async def save_replan_proposal(self, itinerary_id: str, proposal: TripReplanResponse) -> None:
        payload = {
            "itinerary_id": itinerary_id,
            "proposal_data": proposal.model_dump(mode="json"),
            "replanner_mode": proposal.replanner_mode,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{self.base_url}/replan_proposals",
                json=payload,
                headers=self.headers,
            )
            resp.raise_for_status()

    async def save_user_feedback(self, itinerary_id: str, feedback: Dict[str, Any]) -> None:
        payload = {
            "itinerary_id": itinerary_id,
            "feedback": feedback,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{self.base_url}/user_feedback",
                json=payload,
                headers=self.headers,
            )
            resp.raise_for_status()


def get_repository() -> BaseRepository:
    if settings.is_supabase_enabled and settings.SUPABASE_URL:
        key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_ROLE_KEY or ""
        logger.info("Initializing Supabase repository persistence")
        return SupabaseRepository(supabase_url=settings.SUPABASE_URL, api_key=key)
    return InMemoryRepository()


repository = get_repository()
