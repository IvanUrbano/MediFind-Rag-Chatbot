"""MediFind PH RAG package - Phase 2: PDF ingestion and ChromaDB knowledge base.

Heavy imports (langchain, chromadb, sentence-transformers) live in the
submodules; importing ``rag`` only exposes the selected configuration.
"""

from rag.config import CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_MODEL, TOP_K

__all__ = ["CHUNK_SIZE", "CHUNK_OVERLAP", "TOP_K", "EMBEDDING_MODEL"]
