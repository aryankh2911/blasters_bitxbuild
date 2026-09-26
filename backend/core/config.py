"""
Central configuration for the Samajh backend.

All settings are read from environment variables (or a .env file via pydantic-settings).
Defaults are chosen so the application runs in zero-cost mock mode out of the box.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LLM
    anthropic_api_key: str = ""
    model_id: str = "claude-sonnet-4-6"
    mock_llm: bool = True          # True → no API calls, returns canned responses
    max_tokens: int = 1500         # Max tokens in LLM response — 1500 fits complex inputs without verbose bloat
    temperature: float = 0.2       # Low temperature for structured analysis output
    chat_temperature: float = 0.65 # Higher temperature for natural conversational responses
    chat_max_tokens: int = 1024

    # Guardrails
    max_input_characters: int = 1000  # Hard limit; protects against token drain

    # Rate limiting (slowapi format: "N/period")
    rate_limit_string: str = "15/minute"

    # CORS — comma-separated allowed origins
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"


# Singleton — import `settings` everywhere instead of instantiating again
settings = Settings()
