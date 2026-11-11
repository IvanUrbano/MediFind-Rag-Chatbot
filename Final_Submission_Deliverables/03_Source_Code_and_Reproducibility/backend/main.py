"""MediFind PH FastAPI backend - Phase 3 RAG chat API."""

import json
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag import generation
from rag.config import CHROMA_DIR, GENERATION_MODEL, MANIFEST_PATH, SOURCE_DIR
from rag.pipeline import answer_question
from rag.catalog import catalog_categories, catalog_records, get_catalog_record, search_catalog

DATA_DIR = SOURCE_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload flan-t5 in the background so the first chat is not a cold start.
    threading.Thread(target=generation.warmup, daemon=True).start()
    yield


app = FastAPI(title="MediFind PH API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # no auth/cookies; any dev origin must be able to call
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class SourceCitation(BaseModel):
    source: str
    page: int | None = None
    passage: str = ""


class MedicineCardModel(BaseModel):
    id: str | None = None
    brand: str
    genericName: str | None = None
    activeIngredients: list[str] | None = None
    strength: str | None = None
    dosageForm: str | None = None
    pharmacologicCategory: str | None = None
    registrationNumber: str | None = None
    manufacturer: str | None = None
    indications: str | None = None


class CatalogMedicineModel(MedicineCardModel):
    category: str
    citations: list[SourceCitation] = Field(default_factory=list)


class CatalogCategoryModel(BaseModel):
    name: str
    source: str
    count: int


class CatalogResponse(BaseModel):
    items: list[CatalogMedicineModel]
    total: int
    filtered: int
    categories: list[CatalogCategoryModel]


class ChatResponse(BaseModel):
    answer: str
    status: str = "ok"  # ok | insufficient_evidence | unsupported
    sources: list[SourceCitation] = []
    medicine: list[MedicineCardModel] | None = None
    recognized: str | None = None


def _index_info() -> dict:
    """Read chunk count from the Phase 2 manifest (no model loading)."""
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        return {
            "chunks": manifest.get("chunk_count"),
            "path": str(CHROMA_DIR),
        }
    except Exception as exc:
        return {"error": f"knowledge base unavailable: {exc}"}


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "medifind-ph-backend",
        "index": _index_info(),
        "generation": {
            "model": GENERATION_MODEL,
            "loaded": generation.is_loaded(),
            "error": generation.load_error(),
        },
    }


@app.get("/api/documents")
def list_documents() -> dict:
    docs = sorted(p.name for p in DATA_DIR.glob("*.pdf")) if DATA_DIR.exists() else []
    return {"documents": docs}


@app.get("/api/medicines", response_model=CatalogResponse)
def list_medicines(
    q: str = Query(default="", max_length=200),
    category: str = Query(default="", max_length=100),
) -> CatalogResponse:
    """Return full structured records independently of RAG top-k retrieval."""
    items = search_catalog(q, category)
    return CatalogResponse(
        items=items,
        total=len(catalog_records()),
        filtered=len(items),
        categories=catalog_categories(),
    )


@app.get("/api/medicines/{medicine_id}", response_model=CatalogMedicineModel)
def medicine_detail(medicine_id: str) -> CatalogMedicineModel:
    record = get_catalog_record(medicine_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Medicine record not found")
    return CatalogMedicineModel(**record)


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    return answer_question(req.message)
