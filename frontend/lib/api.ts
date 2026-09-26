/**
 * API client for the Samajh backend.
 *
 * All backend communication goes through this file.
 * Change API_BASE here to point at a different environment (staging, prod).
 */

import type {
  AnalysisResponse,
  ChatRequest,
  HealthResponse,
} from "@/types/analysis";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Analysis — POST /api/v1/analyze
// ---------------------------------------------------------------------------

/**
 * Run the full 5-step Samajh pipeline on the given text.
 * Returns a structured AnalysisResponse with token classifications and
 * the 3-tier breakdown.
 *
 * Throws if the request fails or the backend returns a non-2xx status.
 */
export async function analyzeText(text: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Analysis failed (${res.status}): ${detail}`);
  }

  return res.json() as Promise<AnalysisResponse>;
}

// ---------------------------------------------------------------------------
// Chat — POST /api/v1/chat  (SSE streaming)
// ---------------------------------------------------------------------------

/**
 * Stream a conversational response from the backend.
 *
 * Reads the SSE stream, calling `onChunk` for each text fragment and
 * `onDone` when the stream ends with the [DONE] sentinel.
 *
 * @param request    ChatRequest payload (message + history + optional breakdown)
 * @param onChunk    Called for each text chunk as it arrives
 * @param onDone     Called once when the stream is complete
 * @param onError    Called if the stream errors mid-flight
 */
export async function streamChat(
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError?: (err: Error) => void,
): Promise<void> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => res.statusText);
    onError?.(new Error(`Chat failed (${res.status}): ${detail}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const events = buffer.split("\n\n");
      // Keep the last (possibly incomplete) chunk in the buffer
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event.replace(/^\n+|\n+$/g, "");
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6); // strip "data: "

        if (data === "[DONE]") {
          onDone();
          return;
        }

        // Unescape newlines encoded by the backend (\n → actual newline)
        onChunk(data.replace(/\\n/g, "\n"));
      }
    }
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Health check — GET /health
// ---------------------------------------------------------------------------

/**
 * Fetch the backend health status.
 * Used by the Header to determine whether to show MOCK MODE or LIVE badge.
 * Returns null if the backend is unreachable.
 */
export async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<HealthResponse>;
  } catch {
    return null;
  }
}
