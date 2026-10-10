import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status

from app.schemas.itinerary import Itinerary
from app.schemas.replanning import TripReplanRequest, TripReplanResponse
from app.services.replanner import trip_replanner
from app.db.repository import repository

logger = logging.getLogger("safehaven.api.trips")
router = APIRouter(prefix="/trips", tags=["Trips & Replanning"])


@router.post("/replan", response_model=TripReplanResponse, summary="Replan Itinerary Using Validated AI & Alternatives")
async def replan_trip(request: TripReplanRequest) -> TripReplanResponse:
    """
    Submits an itinerary to the SafeHaven AI Replanner.
    Evaluates risks server-side (weather, official warnings, disaster intelligence),
    discovers genuine OpenStreetMap alternatives for risky activities,
    ranks candidates transparently, and outputs a validated revised schedule.
    """
    try:
        response = await trip_replanner.replan_itinerary(
            itinerary=request.itinerary,
            force_deterministic=request.force_deterministic,
        )

        # Persist proposal if an itinerary ID is present
        if request.itinerary.id:
            await repository.save_replan_proposal(request.itinerary.id, response)

        return response
    except Exception as e:
        logger.error(f"Error in trip replanning: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate replanned itinerary due to an internal error.",
        )


@router.post("/{itinerary_id}/feedback", summary="Submit User Feedback on Replanning Proposal")
async def submit_trip_feedback(itinerary_id: str, feedback: Dict[str, Any]) -> Dict[str, str]:
    """
    Accepts traveler acceptance, rejection, or comments on replanned proposals.
    """
    await repository.save_user_feedback(itinerary_id, feedback)
    return {"status": "ok", "message": "Feedback recorded successfully."}


@router.get("/{itinerary_id}", response_model=Itinerary, summary="Retrieve Saved Itinerary")
async def get_saved_itinerary(itinerary_id: str) -> Itinerary:
    itin = await repository.get_itinerary(itinerary_id)
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found.")
    return itin
