"""
RAG service for Isomer: ChromaDB + OpenAI embeddings, metadata filtering, grounded generation.
Satisfies: Objective B (Grounded RAG), TextbookChunk schema, chapter-scoped retrieval.
"""

import os
import re
from typing import Optional

import chromadb
from chromadb.config import Settings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Data model (Objective: TextbookChunk schema)
# ---------------------------------------------------------------------------

class TextbookChunk(BaseModel):
    text: str
    chapter_title: str
    page_number: Optional[int] = None
    latex_formulas: Optional[list[str]] = None  # extracted formulas if needed


# ---------------------------------------------------------------------------
# Chapter detection for High_School_Mathematics_Extensions.txt
# ---------------------------------------------------------------------------

CHAPTER_HEADERS = [
    "Primes and modular arithmetic",
    "Logic",
    "Mathematical proofs",
    "Infinity and infinite processes",
    "Counting and Generating functions",
    "Counting and generating functions",
    "Discrete Probability",
    "Financial options",
    "Matrices",
    "Further modular arithmetic",
    "Mathematical programming",
    "Basic counting",
    "Partial fractions",
    "Summation sign",
    "Complex numbers",
    "Differentiation",
]


def split_text_by_chapters(content: str) -> list[tuple[str, str]]:
    """Split raw textbook content into (chapter_title, section_text) pairs. Skips TOC for full textbook; supports demo-style file that starts with chapter title."""
    pairs: list[tuple[str, str]] = []
    # Demo-style file: no "Authors", starts with "Primes and modular arithmetic" (or similar)—use full content
    is_demo_style = "Authors\n" not in content or len(content) < 60000
    if is_demo_style:
        body_start = 0
    else:
        authors_idx = content.find("Authors\n")
        if authors_idx >= 0:
            body_start = content.find("\nPrimes and modular arithmetic\n", authors_idx)
            if body_start < 0:
                body_start = content.find("Primes and modular arithmetic\n", authors_idx)
            if body_start >= 0:
                body_start += 1
            else:
                body_start = content.find("A prime number")
        else:
            body_start = content.find("A prime number")
        if body_start < 0:
            body_start = 0
    content_body = content[body_start:]
    content_body_lower = content_body.lower()

    # Find chapter header positions (header on its own line, or at start of file)
    positions: list[tuple[int, str]] = []
    for ch in CHAPTER_HEADERS:
        if content_body_lower.startswith(ch.lower() + "\n") or content_body_lower.startswith(ch.lower() + "\r\n"):
            positions.append((0, ch))
        pos = content_body_lower.find("\n" + ch.lower() + "\n")
        if pos >= 0:
            pos += 1  # after newline
            positions.append((pos, ch))
        else:
            pos = content_body_lower.find(ch.lower())
            if pos >= 0:
                line_start = content_body.rfind("\n", 0, pos) + 1
                line = content_body[line_start:line_start + 80].split("\n")[0]
                if line.strip().lower() == ch.lower() or line.strip().lower().startswith(ch.lower()):
                    positions.append((line_start, ch))

    positions.sort(key=lambda x: x[0])
    seen = set()
    unique_positions = []
    for pos, ch in positions:
        key = ch.lower().strip()
        if key not in seen:
            seen.add(key)
            unique_positions.append((pos, ch))

    for i, (pos, chapter_title) in enumerate(unique_positions):
        end = unique_positions[i + 1][0] if i + 1 < len(unique_positions) else len(content_body)
        section = content_body[pos:end].strip()
        if len(section) > 150:
            pairs.append((chapter_title, section))
    if not pairs:
        pairs.append(("Full text", content_body[:150000]))
    return pairs


# ---------------------------------------------------------------------------
# ChromaDB + embeddings
# ---------------------------------------------------------------------------

PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "isomer_textbook_chunks"


def get_chroma_client():
    return chromadb.PersistentClient(path=PERSIST_DIR, settings=Settings(anonymized_telemetry=False))


def get_openai_client():
    return OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def get_embedding(text: str) -> list[float]:
    client = get_openai_client()
    r = client.embeddings.create(model="text-embedding-3-small", input=text[:8000])
    return r.data[0].embedding


def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


# ---------------------------------------------------------------------------
# Ingest: chunk with RecursiveCharacterTextSplitter, embed, store with metadata
# ---------------------------------------------------------------------------

def ingest_from_text(full_text: str) -> int:
    """Chunk by chapters, split with RecursiveCharacterTextSplitter, embed, add to ChromaDB. Returns count of chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    pairs = split_text_by_chapters(full_text)
    collection = get_collection()
    ids_list = []
    documents = []
    metadatas = []
    count = 0
    for chapter_title, section in pairs:
        chunks = splitter.split_text(section)
        for i, c in enumerate(chunks):
            if not c.strip():
                continue
            doc_id = f"{chapter_title}_{count}".replace(" ", "_")[:100]
            ids_list.append(doc_id)
            documents.append(c)
            metadatas.append({"chapter_title": chapter_title, "page_number": None})
            count += 1
    if not documents:
        return 0
    # Embed in batches to avoid rate limits
    batch_size = 50
    for start in range(0, len(documents), batch_size):
        batch_docs = documents[start : start + batch_size]
        batch_ids = ids_list[start : start + batch_size]
        batch_meta = metadatas[start : start + batch_size]
        embeddings = [get_embedding(d) for d in batch_docs]
        collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_meta)
    return len(documents)


# ---------------------------------------------------------------------------
# Retrieval with metadata filter (by chapter_title)
# ---------------------------------------------------------------------------

def retrieve(
    query: str,
    chapter_title: Optional[str] = None,
    n_results: int = 6,
) -> list[dict]:
    """Query ChromaDB; filter by chapter_title when provided."""
    collection = get_collection()
    where = None
    if chapter_title:
        where = {"chapter_title": chapter_title}
    if query.strip():
        query_embedding = get_embedding(query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, 20),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        docs = results["documents"][0] if results["documents"] else []
        metas = results["metadatas"][0] if results["metadatas"] else []
    else:
        # Return chunks from chapter only (no semantic query)
        got = collection.get(where=where, limit=n_results, include=["documents", "metadatas"])
        docs = got["documents"] or []
        metas = got["metadatas"] or []
    out = []
    for i, doc in enumerate(docs):
        meta = metas[i] if i < len(metas) else {}
        out.append({"text": doc, "chapter_title": meta.get("chapter_title", ""), "page_number": meta.get("page_number")})
    return out


def list_chapters() -> list[str]:
    """List unique chapter_title values in the collection."""
    try:
        collection = get_collection()
        data = collection.get(include=["metadatas"])
        titles = set()
        for m in (data.get("metadatas") or []):
            if m and "chapter_title" in m:
                titles.add(m["chapter_title"])
        return sorted(titles)
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Grounded agent: "You MUST only use the provided context"
# ---------------------------------------------------------------------------

def generate_grounded_response(query: str, retrieved_chunks: list[dict], openai_client: Optional[OpenAI] = None) -> str:
    """Generate a response using only the provided chunks. If answer not in context, say so."""
    client = openai_client or get_openai_client()
    context = "\n\n---\n\n".join([c.get("text", "") for c in retrieved_chunks])
    system = """You are a tutor for high school mathematics. You MUST only use the provided context from the textbook to answer. If the answer is not in the context, say "The textbook does not cover this." Do NOT use your general knowledge. Quote or paraphrase only from the context."""
    user = f"Context from the textbook:\n\n{context}\n\nQuestion: {query}"
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.2,
    )
    return (r.choices[0].message.content or "").strip()


# ---------------------------------------------------------------------------
# ADHD transformation: bullets, key terms, one check question
# ---------------------------------------------------------------------------

def adhd_transform(raw_paragraph: str, openai_client: Optional[OpenAI] = None) -> dict:
    """Transform raw textbook paragraph into ADHD-friendly format: bulleted list, key terms, one check question."""
    client = openai_client or get_openai_client()
    prompt = f"""Transform this textbook excerpt for an ADHD-friendly learner. Output exactly the following structure.

Raw text:
{raw_paragraph[:4000]}

Provide:
1) bulleted_summary: Rewrite the main ideas as clear bullet points (3-6 bullets).
2) key_terms: A comma-separated list of 3-6 key terms or phrases to remember.
3) check_question: One short "Check for Understanding" multiple-choice question (with 4 options, one correct). Format as: Question: ... | A) ... B) ... C) ... D) ... | Correct: A (or B/C/D).

Use plain text only, no markdown. Keep bulleted_summary concise."""
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    text = (r.choices[0].message.content or "").strip()
    # Parse simple structure
    bulleted_summary = key_terms = check_question = ""
    for part in text.split("\n\n"):
        if "bulleted_summary" in part.lower() or (not bulleted_summary and ("•" in part or "- " in part)):
            bulleted_summary = part
        elif "key_terms" in part.lower() or (not key_terms and "key" in part.lower()):
            key_terms = part
        elif "check_question" in part.lower() or "check for understanding" in part.lower():
            check_question = part
    if not bulleted_summary:
        bulleted_summary = text[:1500]
    return {
        "bulleted_summary": bulleted_summary,
        "key_terms": key_terms,
        "check_question": check_question,
        "raw": raw_paragraph[:2000],
    }
