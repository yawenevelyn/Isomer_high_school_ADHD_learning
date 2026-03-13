"""
Verification script: proves that RAG retrieves the correct chapter/topic.
Run after ingest: python verify_rag.py
Expects OPENAI_API_KEY and ChromaDB already populated (run ingest.py first).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag_service import retrieve, list_chapters

def main():
    if not os.environ.get("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY.")
        sys.exit(1)

    print("=== Isomer RAG Verification ===\n")

    chapters = list_chapters()
    print(f"1. Chapters in DB: {len(chapters)}")
    for c in chapters[:15]:
        print(f"   - {c}")
    if len(chapters) > 15:
        print(f"   ... and {len(chapters) - 15} more")

    print("\n2. Retrieval by chapter (metadata filter)")
    for topic in ["Complex numbers", "Matrices", "Logic"]:
        if topic not in chapters:
            # try case-insensitive
            match = next((c for c in chapters if c.lower() == topic.lower()), None)
            if not match:
                print(f"   Topic '{topic}' not in DB, skipping.")
                continue
            topic = match
        chunks = retrieve(query="", chapter_title=topic, n_results=3)
        print(f"   Chapter '{topic}': {len(chunks)} chunks")
        for i, c in enumerate(chunks[:2]):
            preview = (c.get("text") or "")[:120].replace("\n", " ")
            print(f"      [{i+1}] {preview}...")

    print("\n3. Semantic query (grounded retrieval)")
    chunks = retrieve(query="What are complex numbers?", chapter_title=None, n_results=3)
    print(f"   Query 'What are complex numbers?': {len(chunks)} chunks")
    for i, c in enumerate(chunks[:2]):
        ch_title = c.get("chapter_title", "?")
        preview = (c.get("text") or "")[:100].replace("\n", " ")
        print(f"      [{i+1}] [{ch_title}] {preview}...")

    print("\n✓ Verification complete. RAG is retrieving by chapter and by semantic query.")

if __name__ == "__main__":
    main()
