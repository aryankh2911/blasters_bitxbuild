"""
POST /api/v1/analyze

Accepts raw South Asian text and streams back the full structured analysis
as a single SSE event. Using SSE (like /chat) prevents Railway/proxy gateways
from closing the connection while waiting for Claude to return the JSON.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from core.intent_engine import run_pipeline
from core.limiter import limiter
from core.config import settings
from models.schemas import AnalysisRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/analyze",
    summary="Analyse South Asian code-switched text",
    description=(
        "Runs the full 5-step Samajh pipeline: phonetic normalisation, "
        "script detection, idiom retrieval, and LLM token classification "
        "with a 3-tier pragmatic breakdown. Returns a single SSE event."
    ),
)
@limiter.limit(settings.rate_limit_string)
async def analyze(request: Request, body: AnalysisRequest) -> StreamingResponse:
    async def generate():
        try:
            result = await run_pipeline(body)
            yield f"data: {result.model_dump_json()}\n\n"
        except Exception as exc:
            logger.error("analyze pipeline failed: %s", exc)
            yield f"data: ERROR:{exc}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
