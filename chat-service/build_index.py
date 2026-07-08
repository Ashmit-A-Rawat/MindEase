# chat-service/build_index.py
#
# One-time (re-run when documents/ changes) script: chunks every markdown
# file in documents/ by section (## headers), embeds each chunk via Gemini's
# embedding API, and saves a FAISS index + chunk metadata to disk. main.py
# loads these at startup rather than re-embedding on every server restart.
#
# Talks to the Gemini REST API directly rather than through the
# google-generativeai/google-genai SDKs — both SDKs hung indefinitely on this
# machine (traced to IPv6 resolution stalling before falling back to IPv4;
# plain curl avoids this via "happy eyeballs" parallel connection racing,
# but Python's networking stack doesn't by default). Forcing IPv4 via
# local_address fixes it — see the shared client below.
#
# Usage: python build_index.py  (reads GEMINI_API_KEY from chat-service/.env)
import json
import re
from pathlib import Path

import faiss
import httpx
import numpy as np
from dotenv import load_dotenv
import os

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise SystemExit("GEMINI_API_KEY environment variable is required (set it in chat-service/.env)")

EMBED_MODEL = "models/gemini-embedding-001"
API_BASE = "https://generativelanguage.googleapis.com/v1beta"

DOCS_DIR = Path(__file__).parent / "documents"
INDEX_PATH = Path(__file__).parent / "index.faiss"
CHUNKS_PATH = Path(__file__).parent / "chunks.json"

_client = httpx.Client(transport=httpx.HTTPTransport(local_address="0.0.0.0"), timeout=30)


def embed(text: str) -> list[float]:
    resp = _client.post(
        f"{API_BASE}/{EMBED_MODEL}:embedContent",
        params={"key": GEMINI_API_KEY},
        json={"content": {"parts": [{"text": text}]}},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def chunk_markdown(text: str, source: str):
    """Split on ## section headers — the documents are already structured
    this way, so section-level chunks stay semantically coherent without
    needing fixed-size splitting."""
    sections = re.split(r"\n(?=## )", text)
    chunks = []
    title_match = re.match(r"# (.+)", text)
    doc_title = title_match.group(1) if title_match else source
    for section in sections:
        section = section.strip()
        if not section or section.startswith("# "):
            continue
        chunks.append({"text": f"{doc_title}\n\n{section}", "source": source})
    return chunks


def main():
    all_chunks = []
    for md_file in sorted(DOCS_DIR.glob("*.md")):
        text = md_file.read_text()
        file_chunks = chunk_markdown(text, md_file.name)
        all_chunks.extend(file_chunks)
        print(f"{md_file.name}: {len(file_chunks)} chunks")

    print(f"\nEmbedding {len(all_chunks)} chunks total...")
    embeddings = []
    for i, chunk in enumerate(all_chunks):
        embeddings.append(embed(chunk["text"]))
        print(f"  [{i + 1}/{len(all_chunks)}] {chunk['source']}")

    embeddings = np.array(embeddings, dtype="float32")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    faiss.write_index(index, str(INDEX_PATH))
    CHUNKS_PATH.write_text(json.dumps(all_chunks, indent=2))

    print(f"\n✅ Saved index ({dimension}-dim, {len(all_chunks)} vectors) to {INDEX_PATH}")
    print(f"✅ Saved chunk metadata to {CHUNKS_PATH}")


if __name__ == "__main__":
    main()
