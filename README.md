# Samajh — समझ · سمجھ

**A South Asian Vernacular Engine for code-switched text.**

Samajh (Hindi/Urdu for *"understanding"*) is a real-time linguistic analysis engine for Hinglish and Roman Urdu — the natural way over 1.5 billion South Asians actually write and speak. Standard NLP tools and general-purpose AI assistants fail on this register. Samajh doesn't.

---

## The Problem

South Asian code-switching — mixing Hindi, Urdu, Punjabi, Marathi, and other vernaculars with English in a single utterance — is one of the world's most widely-used communication styles. A message like:

> *"mtlb kya hai yaar, ghr pe hai kya"*

is instantly understood by hundreds of millions of people. It is invisible to virtually every NLP tool. Standard models either transliterate it clumsily, hallucinate meanings for echo-reduplications like *"chai shai"*, or lose the cultural subtext entirely.

Samajh solves this with a deterministic pre-processing pipeline paired with structured LLM analysis.

---

## What It Does

Type any Hinglish or Roman Urdu phrase and get back:

| Output | Description |
|--------|-------------|
| **Token Deconstruction** | Every word colour-coded by category: English, Vernacular, Dialect Variant, Echo Reduplication, Idiom/Slang |
| **Language Composition** | Visual breakdown of script mix per message |
| **Literal Translation** | Word-for-word rendering |
| **Pragmatic Intent** | What the speaker actually means (soft refusal, sarcasm, urgency, invitation) |
| **Cultural Subtext** | The social register, relationship dynamic, and cultural context |
| **Conversational Assistant** | A Hinglish-aware AI that responds in the same mixed register |

---

## Architecture

```
Raw Input
   ↓
[1] Phonetic Pre-processor  (deterministic)
    · Retroflex normalisation: larka ↔ ladka
    · Vowel compression: mtlb → matlab, ghr → ghar
    · H-drop: hai ↔ he ↔ e
   ↓
[2] Script + Structure Detector  (deterministic)
    · Unicode range classification per character
    · Language proportion estimation
    · Echo reduplication detection (regex)
   ↓
[3] Idiom Retriever  (JSON dictionary)
    · Phrase-level match against curated South Asian idiom store
   ↓
[4] LLM Analysis  (Claude API — structured JSON)
    · Per-token 5-category classification
    · 3-tier pragmatic breakdown
   ↓
[5] Visual Dashboard + Conversational Stream (SSE)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Backend | Python 3.11, FastAPI, Pydantic v2 |
| LLM | Anthropic Claude API (`claude-sonnet-4-6`) |
| Streaming | Server-Sent Events (SSE) |
| Rate Limiting | slowapi |

---

## Project Structure

```
samajh/
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   └── app/page.tsx        # Engine UI (chat + dashboard)
│   ├── components/
│   │   ├── ChatPanel.tsx       # Conversational interface with SSE streaming
│   │   ├── TokenDashboard.tsx  # Language composition + token chip grid
│   │   ├── TokenChip.tsx       # Individual colour-coded token
│   │   ├── IntentBreakdown.tsx # 3-tier pragmatic breakdown cards
│   │   ├── LanguageLegend.tsx  # Category filter legend
│   │   ├── ExampleInputs.tsx   # Pre-loaded demo phrases
│   │   └── Header.tsx          # Nav with live/mock badge + theme toggle
│   └── lib/api.ts              # All backend communication
│
└── backend/                    # FastAPI app
    ├── main.py                 # App entry point, CORS, routing
    ├── routers/
    │   ├── analyze.py          # POST /api/v1/analyze
    │   └── chat.py             # POST /api/v1/chat (SSE)
    ├── core/
    │   ├── preprocessor.py     # Phonetic normalisation
    │   ├── script_detector.py  # Unicode classification + reduplication detection
    │   ├── idiom_retriever.py  # JSON idiom dictionary lookup
    │   ├── intent_engine.py    # Pipeline orchestrator
    │   └── llm_client.py       # Claude API wrapper
    └── data/
        └── idioms.json         # Curated South Asian idiom + reduplication store
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env (never commit this file)
echo "ANTHROPIC_API_KEY=your_key_here" > .env
echo "MOCK_LLM=false" >> .env

uvicorn main:app --reload
# Runs on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Open `http://localhost:3000`. The engine is at `http://localhost:3000/app`.

---

## Token Categories

| Colour | Category | Example |
|--------|----------|---------|
| Blue | Standard English | `meeting`, `plan`, `okay` |
| Green | Transliterated Vernacular | `yaar`, `bhai`, `ghar` |
| Red | Dialect / Phonetic Variant | `larka` (vs `ladka`), `kia` (vs `kiya`) |
| Purple | Echo Reduplication | `shai` in `chai shai` — no independent meaning |
| Orange | Idiom / Slang | `dimag ka dahi`, `kya scene hai` |

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | `backend/.env` | Claude API authentication |
| `MOCK_LLM` | `backend/.env` | `true` = demo mode, `false` = live Claude |
| `NEXT_PUBLIC_API_URL` | Vercel dashboard | Points frontend at the deployed backend URL |

---

## Deployment

- **Frontend** → [Vercel](https://vercel.com) (root dir: `frontend`)
- **Backend** → [Railway](https://railway.app) or [Render](https://render.com) (root dir: `backend`)

Start command for backend host:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set `NEXT_PUBLIC_API_URL` in Vercel's environment variables to your deployed backend URL, then redeploy.

---

## Example Phrases to Try

```
chai shai peena hai yaar
mtlb kya hai, ghr pe hai kya
dimag ka dahi mat kar yaar
larka bahut smart hai, meeting mein
chill maar, koi tension nahi
Du machst mich irre! majhya barobar jasti tp nako karus
```
