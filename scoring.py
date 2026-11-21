"""
Step 3: an AI scores the call on MEDDPICC.

MEDDPICC is a deal-qualification checklist used by many B2B sales teams:
  Metrics, Economic buyer, Decision criteria, Decision process,
  Paper process, Identify pain, Champion, Competition.

We send the transcript to an LLM through AssemblyAI's LLM Gateway, so the
same AssemblyAI API key works for both steps. The Gateway speaks the common
"chat completions" format, so this is a plain HTTPS request.
"""

import json
import os

import requests

GATEWAY_URL = "https://llm-gateway.assemblyai.com/v1/chat/completions"

# Model names change often. Check the LLM Gateway docs for the current list
# and set LLM_MODEL in your .env to change it.
DEFAULT_MODEL = "claude-sonnet-4-5-20250929"

MEDDPICC = [
    "Metrics", "Economic buyer", "Decision criteria", "Decision process",
    "Paper process", "Identify pain", "Champion", "Competition",
]

PROMPT = """You are a strict B2B sales coach reviewing a discovery call.
Speaker {rep} is the sales rep. Everyone else is the buyer side.

For each MEDDPICC element, score 0-2:
  0 = not uncovered, 1 = touched on, 2 = clearly uncovered with specifics.
Quote the buyer's own words as evidence when you can.

Also list the buyer's objections, the agreed next step (or "none"),
and the 3 questions the rep should have asked but didn't.

Reply with ONLY JSON in this shape:
{{
  "meddpicc": [{{"element": "Metrics", "score": 0, "evidence": "..."}}, ...],
  "objections": ["..."],
  "next_step": "...",
  "missed_questions": ["...", "...", "..."],
  "one_line_summary": "..."
}}

Transcript:
{transcript}
"""


def format_transcript(utterances: list[dict]) -> str:
    return "\n".join(f"Speaker {u['speaker']}: {u['text']}" for u in utterances)


def score_call(utterances: list[dict], api_key: str, rep: str = "A") -> dict:
    model = os.getenv("LLM_MODEL", DEFAULT_MODEL)
    response = requests.post(
        GATEWAY_URL,
        headers={"Authorization": api_key},
        json={
            "model": model,
            "messages": [{"role": "user", "content": PROMPT.format(rep=rep, transcript=format_transcript(utterances))}],
            "max_tokens": 2000,
        },
        timeout=120,
    )
    response.raise_for_status()
    text = response.json()["choices"][0]["message"]["content"]
    return parse_json(text)


def parse_json(text: str) -> dict:
    """LLMs sometimes wrap JSON in ```fences``` or add a sentence; strip that."""
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start : end + 1])
