"""
CLI script to ingest the textbook into ChromaDB.
Run from backend/ with OPENAI_API_KEY set.
Usage: python ingest.py [path_to_textbook.txt]
Default path: ../public/High_School_Mathematics_Extensions.txt
"""

import os
import sys

# Add parent so we can import rag_service
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag_service import ingest_from_text

DEFAULT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "High_School_Mathematics_Extensions.txt")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    if not os.path.isfile(path):
        print(f"File not found: {path}")
        sys.exit(1)
    if not os.environ.get("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY environment variable.")
        sys.exit(1)
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    print(f"Ingesting {len(text)} chars from {path} ...")
    n = ingest_from_text(text)
    print(f"Stored {n} chunks in ChromaDB.")


if __name__ == "__main__":
    main()
