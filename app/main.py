import logging
import time
import uuid
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api.health import router as health_router
from app.api.risk import router as risk_router
from app.api.alerts import router as alerts_router
from app.api.destinations import router as destinations_router
from app.api.trips import router as trips_router
from app.api.guidance import router as guidance_router

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("safehaven")

app = FastAPI(
    title="SafeHaven AI — Travel Risk & Itinerary Intelligence API",
    description="Deterministic travel hazard evaluation, alternative discovery, and AI replanning.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_and_timing_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    start_time = time.time()

    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        response.headers["X-Request-ID"] = correlation_id
        response.headers["X-Response-Time-Ms"] = f"{process_time:.2f}"
        return response
    except Exception as exc:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            "Unhandled exception occurred",
            extra={"correlation_id": correlation_id, "path": request.url.path, "error": str(exc)},
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal server error occurred. Please refer to correlation ID for support.",
                "correlation_id": correlation_id,
            },
            headers={"X-Request-ID": correlation_id},
        )


# Include API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(destinations_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(guidance_router, prefix="/api")


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "SafeHaven AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
