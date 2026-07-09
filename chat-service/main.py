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
    "models/gemini-flash-lite-latest",
    "models/gemini-3-flash-preview",
    "models/gemini-3.1-flash-lite",
    "models/gemini-3.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-001",
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.0-flash-lite-001",
    "models/gemini-pro-latest",
    "models/gemini-3-pro-preview",
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


# Pre-written per-language, not LLM-generated — the whole point of the
# crisis gate is a fixed, reliable response that doesn't depend on the LLM
# (or even the network) being up. Falls back to English for any language
# not covered here.
CRISIS_RESPONSE_TEXT = {
    "en": (
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
    ),
    "hi": (
        "मैंने अभी जो आपने साझा किया उसे लेकर मुझे वाकई चिंता है, और मैं चाहता/चाहती हूँ कि आपको ऐसी सहायता मिले जो "
        "अभी वास्तव में मदद करने में सक्षम हो — यह इस तरह की चैट में मैं सुरक्षित रूप से जो कर सकता/सकती हूँ उससे कहीं आगे है।\n\n"
        "**कृपया अभी संपर्क करें:**\n"
        "- नेशनल सुसाइड प्रिवेंशन लाइफलाइन (US): 988 पर कॉल या टेक्स्ट करें\n"
        "- क्राइसिस टेक्स्ट लाइन: HOME को 741741 पर टेक्स्ट करें\n"
        "- iCall (भारत): +91 9152987821\n"
        "- वंद्रेवाला फाउंडेशन हेल्पलाइन (भारत): 1860-2662-345 (24/7)\n"
        "- यदि आप तत्काल खतरे में हैं, तो कृपया स्थानीय आपातकालीन सेवाओं से संपर्क करें या निकटतम अस्पताल जाएं।\n\n"
        "यदि संभव हो, तो कृपया अपने पास किसी विश्वसनीय व्यक्ति को भी अभी बताएं — आपको इससे अकेले नहीं गुज़रना है। "
        "आप MindEase के माध्यम से सीधे कैंपस काउंसलर के साथ सत्र भी बुक कर सकते हैं।"
    ),
    "mr": (
        "तुम्ही आत्ताच जे शेअर केले त्याबद्दल मला खरोखर काळजी वाटते आहे, आणि मला वाटते की तुम्हाला अशी मदत मिळावी जी "
        "आत्ता खरोखर मदत करण्यास सक्षम आहे — हे अशा चॅटमध्ये मी सुरक्षितपणे जे करू शकतो त्यापलीकडचे आहे.\n\n"
        "**कृपया आत्ताच संपर्क साधा:**\n"
        "- नॅशनल सुसाईड प्रिव्हेन्शन लाइफलाइन (US): 988 वर कॉल किंवा टेक्स्ट करा\n"
        "- क्रायसिस टेक्स्ट लाइन: HOME 741741 वर टेक्स्ट करा\n"
        "- iCall (भारत): +91 9152987821\n"
        "- वंद्रेवाला फाउंडेशन हेल्पलाइन (भारत): 1860-2662-345 (24/7)\n"
        "- जर तुम्ही तात्काळ धोक्यात असाल, तर कृपया स्थानिक आपत्कालीन सेवांशी संपर्क साधा किंवा जवळच्या रुग्णालयात जा.\n\n"
        "शक्य असल्यास, कृपया तुमच्या जवळच्या एखाद्या विश्वासू व्यक्तीलाही आत्ताच सांगा — तुम्हाला हे एकट्याने सहन करण्याची गरज नाही. "
        "तुम्ही MindEase द्वारे थेट कॅम्पस समुपदेशकासोबत सत्रही बुक करू शकता."
    ),
    "ta": (
        "நீங்கள் இப்போது பகிர்ந்ததைப் பற்றி எனக்கு மிகவும் கவலையாக இருக்கிறது, இப்போது உண்மையில் உதவக்கூடிய ஆதரவை நீங்கள் "
        "பெற வேண்டும் என்று நான் விரும்புகிறேன் — இது இதுபோன்ற அரட்டையில் நான் பாதுகாப்பாகச் செய்யக்கூடியதற்கு அப்பாற்பட்டது.\n\n"
        "**தயவுசெய்து இப்போதே தொடர்பு கொள்ளுங்கள்:**\n"
        "- நேஷனல் சூசைட் பிரிவென்ஷன் லைஃப்லைன் (US): 988-க்கு அழைக்கவும் அல்லது குறுஞ்செய்தி அனுப்பவும்\n"
        "- கிரைசிஸ் டெக்ஸ்ட் லைன்: HOME என்பதை 741741-க்கு குறுஞ்செய்தி அனுப்பவும்\n"
        "- iCall (இந்தியா): +91 9152987821\n"
        "- வாண்ட்ரேவாலா அறக்கட்டளை உதவி எண் (இந்தியா): 1860-2662-345 (24/7)\n"
        "- நீங்கள் உடனடி ஆபத்தில் இருந்தால், உள்ளூர் அவசர சேவைகளைத் தொடர்பு கொள்ளவும் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும்.\n\n"
        "முடிந்தால், உங்களுக்கு அருகில் இருக்கும் நம்பகமான ஒருவரிடமும் இப்போதே சொல்லுங்கள் — நீங்கள் இதைத் தனியாக சமாளிக்க வேண்டியதில்லை. "
        "MindEase மூலம் நேரடியாக கேம்பஸ் ஆலோசகருடன் ஒரு அமர்வையும் முன்பதிவு செய்யலாம்."
    ),
}

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


LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
}


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    language: Optional[str] = "en"


# ------------------ Endpoints ------------------ #
@app.post("/chat")
async def chat(data: ChatRequest):
    language = (data.language or "en").split("-")[0]  # e.g. "en-US" -> "en"

    if is_crisis_message(data.message):
        print("🚨 CRISIS KEYWORD MATCHED — bypassing retrieval and LLM entirely")
        response_text = CRISIS_RESPONSE_TEXT.get(language, CRISIS_RESPONSE_TEXT["en"])
        return {"success": True, "response": response_text, "is_crisis": True, "sources": []}

    if not CHAT_MODEL:
        raise HTTPException(status_code=503, detail="Chat service not configured (missing GEMINI_API_KEY or no working model found)")

    try:
        retrieved = retrieve(data.message, top_k=3)
        context_text = "\n\n---\n\n".join(c["text"] for c in retrieved)
        sources = sorted(set(c["source"] for c in retrieved))

        history_text = "\n".join(f"{m.role}: {m.content}" for m in (data.history or [])[-6:])

        language_name = LANGUAGE_NAMES.get(language, "English")

        # The language directive lives in systemInstruction rather than the
        # user-turn text — Gemini weights systemInstruction more heavily, and
        # a plain-text reminder buried in the prompt body was unreliable for
        # lower-resource languages (Marathi in particular kept slipping back
        # to English even when told explicitly).
        system_instruction = SYSTEM_PROMPT
        if language != "en":
            system_instruction += (
                f"\n\nCRITICAL: You must write your ENTIRE reply in {language_name} ({language}) — "
                f"every sentence, no English mixed in — because that is this student's selected app "
                f"language. The only exception: if the student's own message is written in a different "
                f"language, match theirs instead of {language_name}."
            )

        prompt = f"""Relevant context from MindEase's resource library:
{context_text if context_text else "(no specific matching resource — answer from general supportive knowledge)"}

Recent conversation:
{history_text if history_text else "(this is the first message)"}

Student's message: {data.message}

Respond as MindEase's AI Support companion:"""

        result = gemini_post(
            CHAT_MODEL,
            "generateContent",
            {
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            },
            timeout=30,
        )
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
