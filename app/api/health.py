from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="System Health and Dependency Status")
async def get_health() -> Dict[str, Any]:
    """
    Check system health status and configuration readiness.
    Safely reveals dependency availability without exposing any secrets or keys.
    """
    return {
        "status": "healthy",
        "service": "SafeHaven AI Backend",
        "version": "1.0.0",
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "weather_service": {
                "provider": "Open-Meteo",
                "status": "available",
                "base_url": settings.OPEN_METEO_BASE_URL,
            },
            "geocoding_places": {
                "provider": "OpenStreetMap Nominatim & Overpass",
                "status": "available",
            },
            "warning_feeds": {
                "gdacs": bool(settings.GDACS_FEED_URL),
                "reliefweb": bool(settings.RELIEFWEB_API_URL),
                "usgs_earthquakes": bool(settings.USGS_EARTHQUAKE_FEED_URL),
                "status": "configured",
            },
            "persistence": {
                "mode": "supabase_postgresql" if settings.is_supabase_enabled else "in_memory_fixture",
                "supabase_configured": settings.is_supabase_enabled,
            },
            "ai_engine": {
                "enabled": settings.is_llm_enabled,
                "model": settings.LLM_MODEL if settings.is_llm_enabled else "deterministic_fallback_only",
            },
            "cache": {
                "status": "active",
                "default_ttl_seconds": settings.CACHE_TTL_SECONDS,
            },
        },
    }
