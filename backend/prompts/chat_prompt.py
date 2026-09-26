"""
System prompt and message builder for the /chat SSE endpoint.

The chat assistant speaks natural Hinglish / Roman Urdu by default and shifts
into cultural explanation mode when the user explicitly asks for it.  It is
also aware of the current analysis panel breakdown so it can answer follow-up
questions about a specific input without the user having to repeat themselves.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.schemas import ChatMessage


CHAT_SYSTEM_PROMPT = """You are Samajh — a South Asian conversational assistant. \
Speak the way urban South Asians text: Hinglish by default, casual, direct.

## STYLE
- Natural Hinglish by default: "haan yaar", "arre", "matlab", "bilkul".
- Adapt to the input. Short casual message → short casual reply. Deep question → full answer.
- No padding, no "great question". Match the register and energy of whoever is talking to you.
- Don't parenthetically translate Hindi words — kills the register.

## EXPLANATION MODE
When asked to "explain", "translate", "what does X mean", "why is X classified" — \
give a real, complete answer with linguistic context and cultural depth. Conversational, not a textbook.

## ANALYSIS CONTEXT
If [ANALYSIS PANEL] appears, use it for follow-ups. Don't repeat what the dashboard already shows.

## RULES
1. You are Samajh. Don't break character.
2. Write exactly as much as the thought needs — no more, no less.
"""


def build_chat_messages(
    user_message: str,
    previous_breakdown: dict | None = None,
    chat_history: list["ChatMessage"] | None = None,
) -> list[dict]:
    """
    Construct the messages array for the chat LLM call.

    Args:
        user_message:       The user's new message (already guardrail-cleaned).
        previous_breakdown: Optional AnalysisResponse dict from the dashboard panel.
                            Injected as context so the model can answer follow-ups
                            about the current analysis without re-deriving it.
        chat_history:       Prior conversation turns (ChatMessage objects), oldest first.

    Returns:
        A list of {"role": ..., "content": ...} dicts ready to pass to the API.
    """
    messages: list[dict] = []

    # Replay prior conversation turns first
    if chat_history:
        for turn in chat_history:
            messages.append({"role": turn.role, "content": turn.content})

    # Build the user content — prepend analysis context when available
    if previous_breakdown:
        # Keep the injected context compact: only the fields a follow-up would need
        context_blob = {
            "tokens": previous_breakdown.get("tokens", []),
            "three_tier": previous_breakdown.get("three_tier", {}),
            "matched_idioms": previous_breakdown.get("matched_idioms", []),
            "register_tone": previous_breakdown.get("register_tone", ""),
            "original_text": previous_breakdown.get("original_text", ""),
        }
        context_str = json.dumps(context_blob, ensure_ascii=False)
        content = (
            f"[ANALYSIS PANEL]\n{context_str}\n[/ANALYSIS PANEL]\n\n{user_message}"
        )
    else:
        content = user_message

    messages.append({"role": "user", "content": content})
    return messages
