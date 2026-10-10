from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure .env is resolved and loaded relative to the project root
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application settings (loaded from .env)
    APP_ENV: str = Field(default="development")
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8000)
    CORS_ORIGINS: str = Field(default="")
    LOG_LEVEL: str = Field(default="INFO")

    # Optional Supabase Persistence (loaded from .env)
    SUPABASE_URL: Optional[str] = Field(default=None)
    SUPABASE_ANON_KEY: Optional[str] = Field(default=None)
    SUPABASE_KEY: Optional[str] = Field(default=None)
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(default=None)

    # Server-side LLM (loaded from .env)
    LLM_API_KEY: Optional[str] = Field(default=None)
    LLM_MODEL: str = Field(default="gpt-4o-mini")
    LLM_BASE_URL: Optional[str] = Field(default=None)

    # External APIs (loaded strictly from .env)
    OPEN_METEO_BASE_URL: str = Field(default="")
    NOMINATIM_BASE_URL: str = Field(default="")
    OVERPASS_BASE_URL: str = Field(default="")
    GDACS_FEED_URL: str = Field(default="")
    RELIEFWEB_API_URL: str = Field(default="")
    USGS_EARTHQUAKE_FEED_URL: str = Field(default="")
    GEOCODING_USER_AGENT: str = Field(default="")

    # Caching and Timeouts (loaded from .env)
    CACHE_TTL_SECONDS: int = Field(default=900)
    WEATHER_CACHE_TTL_SECONDS: int = Field(default=1800)
    WARNINGS_CACHE_TTL_SECONDS: int = Field(default=900)
    PLACES_CACHE_TTL_SECONDS: int = Field(default=3600)
    REQUEST_TIMEOUT_SECONDS: float = Field(default=10.0)

    # Risk Engine Weights (loaded from .env)
    WEIGHT_HAZARD: float = Field(default=0.35)
    WEIGHT_PROXIMITY: float = Field(default=0.25)
    WEIGHT_TEMPORAL: float = Field(default=0.25)
    WEIGHT_CONFIDENCE: float = Field(default=0.15)

    # Alternative Ranking Weights (loaded from .env)
    WEIGHT_SIMILARITY: float = Field(default=0.45)
    WEIGHT_DISTANCE: float = Field(default=0.35)
    WEIGHT_FEASIBILITY: float = Field(default=0.20)

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def supabase_api_key(self) -> Optional[str]:
        return self.SUPABASE_ANON_KEY or self.SUPABASE_KEY or self.SUPABASE_SERVICE_ROLE_KEY

    @property
    def is_supabase_enabled(self) -> bool:
        return bool(self.SUPABASE_URL and self.supabase_api_key)

    @property
    def is_llm_enabled(self) -> bool:
        return bool(self.LLM_API_KEY)


settings = Settings()
