"""PDF loading and chunking - Phase 2 ingestion.

Follows the notebook methodology (GroupApex_RAG_Experiment_Notebook.ipynb,
cell 9): PyPDFLoader per file, source filename kept in metadata, then
RecursiveCharacterTextSplitter with the selected Configuration D values.
"""

from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from rag.config import CHUNK_OVERLAP, CHUNK_SIZE, SOURCE_DIR
from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_documents(folder: Path | str | None = None, verbose: bool = True) -> list[Document]:
    """Load every supported file from ``folder`` (default: source PDFs).

    - Metadata keeps the source *filename* (not the full path), so source
      references stay portable.
    - Pages with no extractable text are skipped and counted (scanned PDFs
      need OCR before they can be indexed).
    - A per-file failure is reported and does not abort the whole run.
    """
    folder = Path(folder) if folder else SOURCE_DIR
    if not folder.exists():
        raise FileNotFoundError(f"Source directory not found: {folder}")

    supported = {".pdf", ".txt", ".md"}
    paths = sorted(p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in supported)
    if not paths:
        raise FileNotFoundError(
            f"No supported documents (.pdf/.txt/.md) found in {folder}. "
            "Add the MediFind OTC PDF volumes first."
        )

    documents: list[Document] = []
    empty_pages = 0
    errors: list[str] = []

    for path in paths:
        try:
            if path.suffix.lower() == ".pdf":
                loaded = PyPDFLoader(str(path)).load()
            else:
                loaded = TextLoader(str(path), encoding="utf-8", autodetect_encoding=True).load()
        except Exception as exc:  # unreadable/corrupt file: keep going
            errors.append(f"{path.name}: {exc}")
            if verbose:
                print(f"[ingestion] Could not load {path.name}: {exc}")
            continue

        kept = 0
        for doc in loaded:
            doc.metadata["source"] = path.name  # filename only, as in the notebook
            if not doc.page_content.strip():
                empty_pages += 1  # no text layer -> likely scanned, needs OCR
                continue
            documents.append(doc)
            kept += 1

        if verbose:
            print(f"[ingestion] Loaded {path.name}: {kept} page(s)")

        if kept == 0:
            errors.append(
                f"{path.name}: 0 pages with extractable text (scanned PDF - OCR required)"
            )

    if empty_pages and verbose:
        print(
            f"[ingestion] Skipped {empty_pages} empty page(s) with no extractable text "
            "(OCR limitation - these pages cannot be indexed)."
        )

    if not documents:
        detail = "; ".join(errors) if errors else "no files read"
        raise ValueError(
            f"No readable text extracted from {folder} ({detail}). "
            "Scanned PDFs require OCR before indexing."
        )

    if errors and verbose:
        print(f"[ingestion] Finished with {len(errors)} warning(s):")
        for err in errors:
            print(f"[ingestion]   - {err}")

    return documents


def split_documents(
    documents: list[Document],
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
    verbose: bool = True,
) -> list[Document]:
    """Split pages into overlapping chunks (Configuration D by default)."""
    if chunk_size <= 0 or chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError(
            f"Invalid chunk parameters: size={chunk_size}, overlap={chunk_overlap} "
            f"(need size > 0 and 0 <= overlap < size)."
        )
    if not documents:
        raise RuntimeError("No documents to split - run load_documents() first.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        add_start_index=True,
    )
    chunks = splitter.split_documents(documents)
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = i

    if not chunks:
        raise RuntimeError("Splitter produced no chunks - check the loaded documents.")
    if verbose:
        print(
            f"[ingestion] Split {len(documents)} page(s) -> {len(chunks)} chunks "
            f"(size={chunk_size}, overlap={chunk_overlap})"
        )
    return chunks
