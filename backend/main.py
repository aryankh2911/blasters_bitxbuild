"""
Samajh API — FastAPI application entry point.

Starts the South Asian Vernacular Engine backend with:
  - CORS configured for local frontend development (from config)
  - slowapi rate limiting
  - /api/v1/analyze  (POST — full pipeline analysis)
  - /api/v1/chat     (POST — SSE conversational stream)
  - /health          (GET  — liveness probe)
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.config import settings
from core.guardrails import log_api_mode
from core.limiter import limiter
from routers import analyze as analyze_router
from routers import chat as chat_router


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown hooks
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    log_api_mode()
    yield
    # Nothing to teardown (JSON idiom cache will GC naturally)


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Samajh API",
    description=(
        "South Asian Vernacular Engine — analyses Hinglish and Roman Urdu "
        "code-switched text with phonetic normalisation, token classification, "
        "idiom retrieval, and a 3-tier pragmatic breakdown."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# --- Rate limiter ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# --- CORS ---
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(analyze_router.router, prefix="/api/v1")
app.include_router(chat_router.router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
async def health():
    return {
        "status": "ok",
        "mock_mode": settings.mock_llm,
        "model": settings.model_id,
    }
