from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://localhost/ats_checker"

    # LLM provider selection - "ollama" requires no API key and is the default
    # so the app works fully offline out of the box.
    ai_provider: Literal["ollama", "openai", "anthropic"] = "ollama"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5"

    # Upload limits
    max_upload_size_bytes: int = 5 * 1024 * 1024

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
