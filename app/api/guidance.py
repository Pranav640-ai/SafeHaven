import logging
from fastapi import APIRouter, HTTPException, status

from app.schemas.guidance import EmergencyGuidanceResponse, ExplainWarningRequest
from app.services.guidance import guidance_service

logger = logging.getLogger("safehaven.api.guidance")
router = APIRouter(prefix="/guidance", tags=["Emergency Guidance"])


@router.post("/explain", response_model=EmergencyGuidanceResponse, summary="Simplify and Translate Official Warning")
async def explain_warning(request: ExplainWarningRequest) -> EmergencyGuidanceResponse:
    """
    Takes an official emergency bulletin (by ID or raw text) and generates:
    1. A plain-language simplified explanation.
    2. A target language translation (e.g., es, fr, hi, ja, zh).
    3. Grounded recommended actions without hallucinating emergency numbers.
    """
    try:
        response = await guidance_service.explain_and_translate(request)
        return response
    except Exception as e:
        logger.error(f"Error in guidance translation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process emergency guidance explanation.",
        )
