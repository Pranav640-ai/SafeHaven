import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status

from app.schemas.itinerary import Itinerary
from app.schemas.risk import RiskAssessmentRequest, RiskAssessmentResponse
from app.services.risk_engine import risk_engine
from app.db.repository import repository

logger = logging.getLogger("safehaven.api.risk")
router = APIRouter(prefix="/risk", tags=["Risk Intelligence"])


@router.post("/assess", response_model=RiskAssessmentResponse, summary="Assess Destination & Activity Travel Risks")
async def assess_travel_risk(request: RiskAssessmentRequest) -> RiskAssessmentResponse:
    """
    Evaluates travel hazards for all planned activities in an itinerary.
    Uses real Open-Meteo forecasts, disaster feeds (GDACS, USGS, ReliefWeb),
    and a deterministic weighted scoring model (R = 100 * (0.35H + 0.25P + 0.25T + 0.15C)).
    """
    try:
        # Convert request to internal Itinerary object
        itin = Itinerary(
            id=request.itinerary_id,
            destination_name=request.destination_name,
            destination_coordinates=request.destination_coordinates,
            start_date=request.start_date,
            end_date=request.end_date,
            activities=request.activities,
            user_preferences=request.user_preferences,
        )

        summary = await risk_engine.assess_itinerary(itin)

        resp = RiskAssessmentResponse(
            itinerary_id=request.itinerary_id,
            assessed_at=datetime.now(timezone.utc),
            summary=summary,
        )

        # Persist if itinerary ID is supplied
        if request.itinerary_id:
            await repository.save_risk_assessment(request.itinerary_id, resp)

        return resp

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        logger.error(f"Error during risk assessment: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete risk assessment due to an internal service error.",
        )
