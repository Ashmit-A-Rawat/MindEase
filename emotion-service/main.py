# emotion-service/main.py
#
# Real-time emotion detection for live counseling calls: OpenCV (Haar
# cascade) for face detection + a pretrained CNN (via the `fer` package,
# TensorFlow Lite backend) for 7-class emotion classification. Each call
# participant's browser captures its own local video frame periodically and
# POSTs it here directly — no video ever transits the Node backend, only the
# small per-frame JPEG and the resulting emotion label.
#
# NOTE: fer==25.10.3's top-level __init__.py doesn't re-export FER (a bug in
# that release) — import from the submodule directly.
import base64
import io

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from fer.fer import FER

app = FastAPI(title="MindEase Emotion Detection Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mtcnn=False -> OpenCV Haar cascade for face detection (fast, CPU-only, no
# extra model download). Loaded once at startup, reused across requests.
detector = FER(mtcnn=False)


class FrameData(BaseModel):
    image: str  # base64-encoded JPEG/PNG, optionally with a data: URL prefix


def decode_image(data_url: str) -> np.ndarray:
    if "," in data_url and data_url.strip().startswith("data:"):
        data_url = data_url.split(",", 1)[1]
    try:
        image_bytes = base64.b64decode(data_url)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.array(image)[:, :, ::-1]  # RGB -> BGR for OpenCV/fer
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")


@app.post("/detect")
async def detect_emotion(data: FrameData):
    frame = decode_image(data.image)
    results = detector.detect_emotions(frame)

    if not results:
        return {"success": True, "face_detected": False, "emotion": None, "confidence": None, "scores": None}

    # Largest detected face (by box area) — the participant's own camera
    # should only ever show one face anyway, this just guards against noise.
    face = max(results, key=lambda r: r["box"][2] * r["box"][3])
    scores = face["emotions"]
    dominant = max(scores, key=scores.get)

    return {
        "success": True,
        "face_detected": True,
        "emotion": dominant,
        "confidence": round(float(scores[dominant]), 3),
        "scores": {k: round(float(v), 3) for k, v in scores.items()},
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "detector_loaded": detector is not None}


@app.get("/")
async def root():
    return {"message": "MindEase Emotion Detection Service", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    print("Starting Emotion Detection Service on http://0.0.0.0:5006")
    uvicorn.run("main:app", host="0.0.0.0", port=5006, reload=True)
