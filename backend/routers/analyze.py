"""
POST /api/v1/analyze

Accepts raw South Asian text and returns the full structured analysis:
token classifications, 3-tier breakdown, script metadata, matched idioms.
"""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.intent_engine import run_pipeline
from core.limiter import limiter
from core.config import settings
from models.schemas import AnalysisRequest, AnalysisResponse

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    summary="Analyse South Asian code-switched text",
    description=(
        "Runs the full 5-step Samajh pipeline: phonetic normalisation, "
        "script detection, idiom retrieval, and LLM token classification "
        "with a 3-tier pragmatic breakdown."
    ),
)
@limiter.limit(settings.rate_limit_string)
async def analyze(request: Request, body: AnalysisRequest) -> AnalysisResponse:
    return await run_pipeline(body)
