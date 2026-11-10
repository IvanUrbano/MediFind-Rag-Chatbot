"""Phase 2 configuration - selected experiment Configuration D.

Values come from GroupApex_RAG_Experiment_Results.xlsx (recommended
configuration: "D (800 / 200 / 3)" - best answer quality 3/9 and best
MRR@3 0.5926). Do not change these without re-running the experiment.
"""

from pathlib import Path

# ---------- Selected indexing / retrieval configuration (run D) ----------
CHUNK_SIZE = 800  # characters per chunk
CHUNK_OVERLAP = 200  # overlapping characters between adjacent chunks
TOP_K = 3  # chunks retrieved per question
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # 384 dims
COLLECTION_NAME = "medifind_otc"

# ---------- Generation (Phase 3, per experiment methodology) ----------
GENERATION_MODEL = "google/flan-t5-base"  # seq2seq, 512-token input window
MAX_INPUT_TOKENS = 512
MAX_NEW_TOKENS = 160  # greedy; benchmark used 64, longer for full card answers
PASSAGE_MAX_CHARS = 700  # citation passage cap

# ---------- Paths (backend/rag/config.py -> project root is two levels up) ----------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = PROJECT_ROOT / "data" / "source_documents"
CHROMA_DIR = PROJECT_ROOT / "data" / "chroma_db"
MANIFEST_PATH = CHROMA_DIR / "manifest.json"
