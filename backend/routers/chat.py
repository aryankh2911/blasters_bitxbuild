"""
POST /api/v1/chat

Streaming SSE chat endpoint.  Accepts a user message + conversation history
and yields the assistant reply as a stream of text chunks so the frontend
can render a typewriter effect.

SSE wire format (each chunk):
    data: <text fragment>\n\n

The stream ends with a sentinel:
    data: [DONE]\n\n
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from core.config import settings
from core.intent_engine import run_chat_stream
from core.limiter import limiter
from models.schemas import ChatMessage

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequestBody(BaseModel):
    """Inbound payload for POST /api/v1/chat."""
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=40)
    previous_breakdown: Optional[dict] = Field(
        default=None,
        description="Optional AnalysisResponse dict from the dashboard panel.",
    )


async def _sse_generator(
    message: str,
    history: list[ChatMessage],
    previous_breakdown: Optional[dict],
):
    """Wrap run_chat_stream into SSE-formatted event strings."""
    try:
        async for chunk in run_chat_stream(message, history, previous_breakdown):
            # Escape any embedded newlines so they don't break the SSE framing
            safe_chunk = chunk.replace("\n", "\\n")
            yield f"data: {safe_chunk}\n\n"
    except Exception as exc:
        logger.error("SSE stream error: %s", exc)
        error_payload = json.dumps({"error": "Stream interrupted"})
        yield f"data: {error_payload}\n\n"
    finally:
        yield "data: [DONE]\n\n"


@router.post(
    "/chat",
    summary="Conversational follow-up (SSE)",
    description=(
        "Returns a Server-Sent Events stream. Each event carries a text chunk. "
        "The stream ends with `data: [DONE]`. "
        "Optionally accepts `previous_breakdown` (AnalysisResponse JSON) so the "
        "assistant can answer follow-up questions about the current analysis."
    ),
)
@limiter.limit(settings.rate_limit_string)
async def chat(request: Request, body: ChatRequestBody) -> StreamingResponse:
    return StreamingResponse(
        _sse_generator(body.message, body.history, body.previous_breakdown),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering if proxied
        },
    )
