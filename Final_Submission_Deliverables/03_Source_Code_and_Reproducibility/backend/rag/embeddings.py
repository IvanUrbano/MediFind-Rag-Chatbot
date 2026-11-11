"""Embedding model wrapper - sentence-transformers/all-MiniLM-L6-v2.

The model is loaded lazily and cached so repeated retrievals (e.g. from
the FastAPI backend) reuse one instance.
"""

from rag.config import EMBEDDING_MODEL

_embeddings = None


def get_embeddings():
    """Return the cached HuggingFace embeddings instance (CPU/CUDA auto)."""
    global _embeddings
    if _embeddings is None:
        from langchain_huggingface import HuggingFaceEmbeddings

        try:
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"

        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": device},
        )
        print(f"[embeddings] Loaded {EMBEDDING_MODEL} on {device}")
    return _embeddings
