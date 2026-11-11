"""Retrieval API - top-k similarity search with source references.

Returns plain dicts (JSON-serializable) so the FastAPI backend can serve
them directly in a later phase. Page numbers are 1-based for display.
"""

from rag.config import TOP_K
from rag.storage import get_vectorstore


def retrieve(query: str, k: int = TOP_K) -> list[dict]:
    """Return the top-``k`` chunks for ``query`` with source metadata.

    Each item: ``{"content", "source", "page", "start_index", "chunk_id"}``.
    Empty/whitespace queries return ``[]`` instead of raising.
    """
    query = (query or "").strip()
    if not query:
        return []

    docs = get_vectorstore().similarity_search(query, k=k)
    results = []
    for doc in docs:
        meta = doc.metadata
        page = meta.get("page")
        results.append(
            {
                "content": doc.page_content,
                "source": meta.get("source", "unknown"),
                "page": page + 1 if isinstance(page, int) else None,  # 1-based
                "start_index": meta.get("start_index"),
                "chunk_id": meta.get("chunk_id"),
            }
        )
    return results


def format_source(hit: dict) -> str:
    """Human-readable source reference, e.g. ``MediFind_OTC_Vol1_...pdf, page 19``."""
    ref = hit.get("source") or "unknown"
    if hit.get("page"):
        ref += f", page {hit['page']}"
    return ref
