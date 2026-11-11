#!/usr/bin/env python
"""Build (or reload) the MediFind PH ChromaDB knowledge base - Phase 2.

Run from the backend directory:

    python build_kb.py           # build if needed, else reload without re-indexing
    python build_kb.py --force   # full rebuild (changed PDFs or config)

Methodology: Configuration D (chunk 800 / overlap 200 / top-k 3) with
sentence-transformers/all-MiniLM-L6-v2, per GroupApex experiment results.
"""

import argparse
import time

from rag import config, storage
from rag.ingestion import load_documents, split_documents


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the MediFind PH knowledge base.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild even if the existing index is still current.",
    )
    args = parser.parse_args()

    print("=" * 68)
    print("MediFind PH - knowledge base build (Configuration D)")
    print("=" * 68)
    print(f"  chunk size / overlap : {config.CHUNK_SIZE} / {config.CHUNK_OVERLAP}")
    print(f"  embedding model      : {config.EMBEDDING_MODEL}")
    print(f"  top-k                : {config.TOP_K}")
    print(f"  source directory     : {config.SOURCE_DIR}")
    print(f"  chroma directory     : {config.CHROMA_DIR}")

    if not args.force and storage.index_is_current():
        vectorstore = storage.get_vectorstore()
        count = vectorstore._collection.count()
        print(f"\nIndex is current ({count} chunks) - loaded without re-indexing.")
        print("Verify with: python test_retrieval.py")
        return 0

    reason = "forced rebuild" if args.force else "no matching index found"
    print(f"\nBuilding index ({reason})...")

    started = time.time()
    documents = load_documents()
    chunks = split_documents(documents)
    load_s = round(time.time() - started, 1)

    index_started = time.time()
    vectorstore = storage.build(chunks)
    index_s = round(time.time() - index_started, 1)
    count = vectorstore._collection.count()

    print("\n" + "-" * 68)
    print(f"Pages loaded          : {len(documents)}  (load + split: {load_s}s)")
    print(f"Chunks indexed        : {count}  (embeddings + store: {index_s}s)")
    print(f"Manifest              : {config.MANIFEST_PATH}")
    print("Verify with: python test_retrieval.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
