"""Persistent ChromaDB storage with manifest-based rebuild avoidance.

A ``manifest.json`` next to the Chroma database records the indexing
configuration plus a SHA-256 fingerprint of every source PDF. As long as
the fingerprint matches, the existing index is loaded as-is - no
re-embedding, no duplicate vectors.
"""

import hashlib
import json
import shutil
import time
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document

from rag.config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    CHROMA_DIR,
    COLLECTION_NAME,
    EMBEDDING_MODEL,
    MANIFEST_PATH,
    SOURCE_DIR,
)
from rag.embeddings import get_embeddings

_vectorstore: Chroma | None = None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def compute_fingerprint() -> dict:
    """Configuration + content hash of every source PDF."""
    sources = {}
    for pdf in sorted(SOURCE_DIR.glob("*.pdf")):
        sources[pdf.name] = _sha256(pdf)
    return {
        "config": {
            "chunk_size": CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
            "embedding_model": EMBEDDING_MODEL,
            "collection_name": COLLECTION_NAME,
            "loader": "PyPDFLoader",
            "splitter": "RecursiveCharacterTextSplitter",
        },
        "sources": sources,
    }


def _read_manifest() -> dict | None:
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def index_is_current() -> bool:
    """True when a built index exists and matches config + source files."""
    if not CHROMA_DIR.exists() or not MANIFEST_PATH.exists():
        return False
    if not list(SOURCE_DIR.glob("*.pdf")):
        return False
    manifest = _read_manifest()
    if not manifest:
        return False
    return manifest.get("fingerprint") == compute_fingerprint()


def _wipe() -> None:
    """Clear the old index so a rebuild can never append duplicate vectors."""
    global _vectorstore
    if _vectorstore is not None:
        # A live client must drop its collection, never have its folder
        # deleted underneath it (Chroma SQLite error 1032).
        try:
            _vectorstore.delete_collection()
        except Exception:
            pass
        _vectorstore = None

    if CHROMA_DIR.exists():
        try:
            shutil.rmtree(CHROMA_DIR)
        except OSError:
            # Folder locked: fall back to dropping the collection in place.
            try:
                probe = Chroma(
                    collection_name=COLLECTION_NAME,
                    persist_directory=str(CHROMA_DIR),
                    embedding_function=get_embeddings(),
                )
                probe.delete_collection()
            except Exception as exc:
                raise RuntimeError(
                    f"Could not clear the existing index at {CHROMA_DIR}: {exc}. "
                    "Close any program using it and retry with --force."
                ) from exc
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)


def build(chunks: list[Document]) -> Chroma:
    """Embed ``chunks`` into a fresh persistent index and write the manifest.

    Also used by ``build_kb.py --force`` to rebuild after document or
    configuration changes (the fingerprint detects them automatically).
    """
    global _vectorstore
    if not chunks:
        raise RuntimeError("No chunks to index - run ingestion first.")

    _wipe()
    _vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_DIR),
    )

    manifest = {
        "fingerprint": compute_fingerprint(),
        "chunk_count": _vectorstore._collection.count(),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return _vectorstore


def get_vectorstore() -> Chroma:
    """Open the existing persistent index (no re-indexing).

    Raises a clear error when the knowledge base has not been built yet.
    """
    global _vectorstore
    if _vectorstore is None:
        if not CHROMA_DIR.exists() or not MANIFEST_PATH.exists():
            raise RuntimeError(
                f"Knowledge base not found at {CHROMA_DIR}. "
                "Build it first: python build_kb.py"
            )
        _vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            persist_directory=str(CHROMA_DIR),
            embedding_function=get_embeddings(),
        )
        if _vectorstore._collection.count() == 0:
            raise RuntimeError(
                f"Knowledge base at {CHROMA_DIR} is empty. "
                "Rebuild it: python build_kb.py --force"
            )
    return _vectorstore
