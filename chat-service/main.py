# chat-service/main.py
#
# RAG chatbot for MindEase's "AI Support" — replaces the third-party Chatbase
# iframe. Retrieval-augmented generation over chat-service/documents/ (mental
# health psychoeducation content, mostly adapted from the existing
# Resources.jsx page), backed by Gemini for both embeddings and generation.
#
# Talks to the Gemini REST API directly via httpx rather than through the
# google-generativeai (now fully deprecated) or google-genai SDKs — both
# hung indefinitely on this machine (traced to IPv6 resolution stalling
# before falling back to IPv4; curl avoids this via "happy eyeballs"
# parallel connection racing, Python's stack doesn't by default). The
# shared client below forces IPv4 via local_address to fix it. If you're
# deploying somewhere else, this workaround is harmless to keep either way.
#
# Safety design, matching the pattern already established in ml-service/app.py
# for PHQ-9 suicidal-ideation: a hard, deterministic keyword gate runs BEFORE
# any retrieval or LLM call. If it trips, the LLM is never invoked for that
# turn — crisis resources are returned directly. This is intentional: an LLM
# can be inconsistent under adversarial or ambiguous phrasing, but a keyword
# match either fires or it doesn't.
import json
import os
from pathlib import Path
from typing import List, Optional

import faiss
import httpx
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
API_BASE = "https://generativelanguage.googleapis.com/v1beta"
EMBED_MODEL = "models/gemini-embedding-001"

# Model names get renamed/retired over time, and there's no way to be fully
# certain which one is current from here — so instead of hardcoding one and
# hoping, try a descending list of candidates at startup (confirmed against
# this API key's actual /v1beta/models list at the time this was written) and
# lock onto the first one that responds. GEMINI_CHAT_MODEL (if set) is tried
# first, ahead of all of these.
CHAT_MODEL_CANDIDATES = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-001",
    "models/gemini-2.0-flash-lite",
    "models/gemini-flash-latest",
    "models/gemini-pro-latest",
]

if not GEMINI_API_KEY:
    print("⚠️  GEMINI_API_KEY not set — /chat will return 503 until it's configured")


_client = httpx.Client(transport=httpx.HTTPTransport(local_address="0.0.0.0"), timeout=30)


def gemini_post(model: str, method: str, payload: dict, timeout: float = 30) -> dict:
    resp = _client.post(
        f"{API_BASE}/{model}:{method}",
        params={"key": GEMINI_API_KEY},
        json=payload,
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()


def resolve_chat_model() -> Optional[str]:
    """Find the first working chat model, trying GEMINI_CHAT_MODEL (if set)
    before the built-in fallback list. Returns None if every candidate fails
    (e.g. no API key, or all names have since been retired)."""
    if not GEMINI_API_KEY:
        return None

    env_override = os.environ.get("GEMINI_CHAT_MODEL")
    candidates = ([env_override] if env_override else []) + CHAT_MODEL_CANDIDATES

    for name in candidates:
        try:
            gemini_post(name, "generateContent", {"contents": [{"parts": [{"text": "Reply with the single word: ok"}]}]}, timeout=15)
            print(f"✅ Chat model resolved: {name}")
            return name
        except Exception as e:
            print(f"  ✗ {name} unavailable: {e}")
    print("❌ No working Gemini chat model found among candidates")
    return None


CHAT_MODEL = resolve_chat_model()

INDEX_PATH = Path(__file__).parent / "index.faiss"
CHUNKS_PATH = Path(__file__).parent / "chunks.json"

app = FastAPI(title="MindEase AI Support Chat")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

index = None
chunks = []
if INDEX_PATH.exists() and CHUNKS_PATH.exists():
    index = faiss.read_index(str(INDEX_PATH))
    chunks = json.loads(CHUNKS_PATH.read_text())
    print(f"✅ Loaded {len(chunks)} chunks into FAISS index")
else:
    print("⚠️  No index found — run `python build_index.py` first")


# ------------------ Safety gate ------------------ #
# Deliberately broad/over-inclusive: a false positive just shows crisis
# resources to someone who used a hyperbolic phrase, a false negative could
# be genuinely dangerous. Same asymmetric tradeoff as ml-service's PHQ-9
# safety override.
CRISIS_KEYWORDS = [
    "kill myself", "kill me", "suicide", "suicidal", "end my life", "ending my life",
    "want to die", "wanna die", "don't want to live", "dont want to live",
    "hurt myself", "hurting myself", "self harm", "self-harm", "selfharm",
    "cutting myself", "no reason to live", "better off dead", "end it all",
    "not worth living", "can't go on", "cant go on",
]


def is_crisis_message(text: str) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in CRISIS_KEYWORDS)


CRISIS_RESPONSE_TEXT = (
    "I'm really concerned about what you just shared, and I want you to get support that's "
    "actually equipped to help right now — that's beyond what I can safely do in a chat like this.\n\n"
    "**Please reach out right now:**\n"
    "- National Suicide Prevention Lifeline (US): Call or text 988\n"
    "- Crisis Text Line: Text HOME to 741741\n"
    "- iCall (India): +91 9152987821\n"
    "- Vandrevala Foundation Helpline (India): 1860-2662-345 (24/7)\n"
    "- If you're in immediate danger, please contact local emergency services or go to the nearest emergency room.\n\n"
    "If you can, please also tell a trusted person near you right now — you don't have to go through this alone. "
    "You can also book a session with a campus counsellor directly through MindEase."
)

SYSTEM_PROMPT = """You are MindEase's AI Support companion — a warm, non-judgmental psychological \
first-aid assistant for Indian college students. You are NOT a replacement for therapy or \
professional treatment, and you should say so when it's relevant, especially for anything beyond \
everyday stress.

Your scope: everyday coping support, psychoeducation about stress/anxiety/sleep/mindfulness, and \
gently pointing students toward MindEase's other features (PHQ-9/GAD-7/GHQ-12 screening tests, \
booking a session with a campus counsellor, the Resources page) when appropriate.

Guidelines:
- Keep responses concise and warm, not clinical or lecture-y. This is a chat, not an essay.
- Never diagnose. You can describe what a symptom pattern commonly relates to, but always frame it \
as "this sounds like it could be worth exploring with a counsellor," not a diagnosis.
- Ground your answers in the provided context documents when they're relevant, but don't force a \
citation-style answer — talk like a supportive peer, not a search engine.
- If a student's message suggests they're struggling more than "everyday stress" (persistent \
hopelessness, loss of interest in things they used to enjoy, major sleep/appetite changes), gently \
suggest taking one of MindEase's screening tests or booking a counsellor session.
- Do not give medical or medication advice.
"""


# ------------------ Retrieval ------------------ #
def embed_text(text: str) -> np.ndarray:
    result = gemini_post(EMBED_MODEL, "embedContent", {"content": {"parts": [{"text": text}]}})
    return np.array(result["embedding"]["values"], dtype="float32")


def retrieve(query: str, top_k: int = 3):
    if index is None:
        return []
    query_vec = embed_text(query).reshape(1, -1)
    _, indices = index.search(query_vec, top_k)
    return [chunks[i] for i in indices[0] if 0 <= i < len(chunks)]


# ------------------ Schemas ------------------ #
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


# ------------------ Endpoints ------------------ #
@app.post("/chat")
async def chat(data: ChatRequest):
    if is_crisis_message(data.message):
        print("🚨 CRISIS KEYWORD MATCHED — bypassing retrieval and LLM entirely")
        return {"success": True, "response": CRISIS_RESPONSE_TEXT, "is_crisis": True, "sources": []}

    if not CHAT_MODEL:
        raise HTTPException(status_code=503, detail="Chat service not configured (missing GEMINI_API_KEY or no working model found)")

    try:
        retrieved = retrieve(data.message, top_k=3)
        context_text = "\n\n---\n\n".join(c["text"] for c in retrieved)
        sources = sorted(set(c["source"] for c in retrieved))

        history_text = "\n".join(f"{m.role}: {m.content}" for m in (data.history or [])[-6:])

        prompt = f"""{SYSTEM_PROMPT}

Relevant context from MindEase's resource library:
{context_text if context_text else "(no specific matching resource — answer from general supportive knowledge)"}

Recent conversation:
{history_text if history_text else "(this is the first message)"}

Student's message: {data.message}

Respond as MindEase's AI Support companion:"""

        result = gemini_post(CHAT_MODEL, "generateContent", {"contents": [{"parts": [{"text": prompt}]}]}, timeout=30)
        response_text = result["candidates"][0]["content"]["parts"][0]["text"]

        return {"success": True, "response": response_text, "is_crisis": False, "sources": sources}
    except Exception as e:
        print(f"❌ Chat generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {str(e)}")


@app.get("/health")
async def health():
    return {
        "status": "healthy" if CHAT_MODEL else "degraded",
        "gemini_configured": bool(GEMINI_API_KEY),
        "chat_model": CHAT_MODEL,
        "index_loaded": index is not None,
        "chunk_count": len(chunks),
        "message": None if CHAT_MODEL else "No working Gemini chat model resolved — check GEMINI_API_KEY",
    }


@app.get("/")
async def root():
    return {"message": "MindEase AI Support Chat", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    print("Starting AI Support Chat service on http://0.0.0.0:5007")
    uvicorn.run("main:app", host="0.0.0.0", port=5007, reload=True)
