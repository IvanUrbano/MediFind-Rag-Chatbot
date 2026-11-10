# MediFind PH

RAG chatbot for Philippine OTC medicine information (MediFind OTC volumes 1–3).

## Structure

```
medifind-ph/
├── backend/                         # FastAPI + RAG pipeline (.venv inside)
│   ├── rag/                         # modular: config, ingestion, embeddings, storage, retrieval
│   ├── build_kb.py                  # build/reload the Chroma knowledge base
│   ├── test_retrieval.py            # retrieval verification with source references
│   └── main.py                      # FastAPI app
├── frontend/                        # React + Vite chat UI
├── data/
│   ├── source_documents/            # 3 MediFind OTC source PDFs
│   └── chroma_db/                   # persistent vector index (generated)
├── experiments/                     # RAG experiment notebook + results (unchanged)
├── docs/                            # Proposal and deliverables
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+

## Setup

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

Frontend:

```powershell
cd frontend
npm install
```

## Run (two terminals)

Backend (port 8000):

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Frontend (port 5173, proxies `/api` to the backend):

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173

## API

| Method | Path                         | Description                                      |
| ------ | ---------------------------- | ------------------------------------------------ |
| GET    | `/api/health`                | Service health check                             |
| GET    | `/api/documents`             | Lists source PDFs                                |
| GET    | `/api/medicines`             | Complete 94-record catalog with search/filtering |
| GET    | `/api/medicines/{id}`        | Citation-backed medicine details                 |
| POST   | `/api/chat`                  | Chat endpoint (Configuration D RAG)               |

Catalog query parameters are `q` (brand, generic name, active ingredient, or
FDA registration number) and `category` (one of the three PDF-volume
categories). Catalog endpoints enumerate full structured registration records
directly and do not use RAG top-k retrieval.

## Phase 2: Knowledge base (PDF ingestion + ChromaDB)

Selected configuration from `experiments/GroupApex_RAG_Experiment_Results.xlsx`:
**Configuration D — chunk size 800, overlap 200, top-k 3**, embeddings
`sentence-transformers/all-MiniLM-L6-v2`, splitter `RecursiveCharacterTextSplitter`.

Build the index (first run embeds all chunks; later runs reload without re-indexing):

```powershell
cd backend
.\.venv\Scripts\python.exe build_kb.py           # build if needed, else reload
.\.venv\Scripts\python.exe build_kb.py --force   # full rebuild
```

Verify retrieval with source references (9 verified experiment questions):

```powershell
.\.venv\Scripts\python.exe test_retrieval.py
```

Expected results match the experiment: **precision@3 0.2593 | recall@3 0.5370 |
MRR@3 0.5926**, and each hit prints `filename, page N`. The index persists in
`data/chroma_db/` (config + SHA-256 of each PDF are recorded in
`manifest.json`; a rerun only rebuilds when they change).

## Frontend (React + Vite + Tailwind)

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> dist/
```

Mock mode is on by default (`frontend/.env`): responses are clearly labeled
**"Demo response — not verified"** and built only from verified medicine
records. To switch to the real backend once `/api/chat` returns RAG answers:

```ini
VITE_API_URL=http://localhost:8000
VITE_MOCK_MODE=false
```

The API contract expected by `src/api/client.js` is
`POST /api/chat` → `{ answer, status, sources: [{source, page, passage}], medicine? }`.
The Browse Medicines screen requires the FastAPI backend in both mock and live
chat modes because its source of truth is the complete indexed catalog rather
than the ten-record frontend chat mock.
