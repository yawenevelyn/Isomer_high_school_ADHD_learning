"""
FastAPI backend for Isomer: RAG endpoints, grounded chat, chapter selection, ADHD transform.
"""

import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag_service import (
    list_chapters,
    retrieve,
    generate_grounded_response,
    adhd_transform,
    ingest_from_text,
    get_openai_client,
)

app = FastAPI(title="Isomer RAG API", description="Grounded retrieval and teaching agent for high school math.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------

class RetrieveRequest(BaseModel):
    query: str = ""
    chapter_title: Optional[str] = None
    n_results: int = 6


class ChatRequest(BaseModel):
    query: str
    chapter_title: Optional[str] = None
    n_results: int = 5


class IngestRequest(BaseModel):
    full_text: str


class TransformRequest(BaseModel):
    raw_paragraph: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/chapters")
def get_chapters():
    """List all chapter titles (for dropdown)."""
    try:
        chapters = list_chapters()
        return {"chapters": chapters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/retrieve")
def post_retrieve(req: RetrieveRequest):
    """Retrieve chunks, optionally filtered by chapter_title."""
    try:
        chunks = retrieve(query=req.query, chapter_title=req.chapter_title, n_results=req.n_results)
        return {"chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
def post_chat(req: ChatRequest):
    """Grounded chat: answer only from retrieved textbook chunks."""
    try:
        chunks = retrieve(query=req.query, chapter_title=req.chapter_title, n_results=req.n_results)
        if not chunks:
            return {"response": "The textbook does not cover this."}
        client = get_openai_client()
        response = generate_grounded_response(req.query, chunks, openai_client=client)
        return {"response": response, "sources_used": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transform")
def post_transform(req: TransformRequest):
    """ADHD transformation: bullet summary, key terms, check question."""
    try:
        client = get_openai_client()
        result = adhd_transform(req.raw_paragraph, openai_client=client)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest")
def post_ingest(req: IngestRequest):
    """Ingest full text: chunk, embed, store in ChromaDB."""
    if not req.full_text or len(req.full_text) < 100:
        raise HTTPException(status_code=400, detail="full_text too short")
    try:
        count = ingest_from_text(req.full_text)
        return {"status": "ok", "chunks_stored": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
