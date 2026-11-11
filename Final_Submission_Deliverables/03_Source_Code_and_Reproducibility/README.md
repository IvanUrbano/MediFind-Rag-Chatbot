# Source Code and Reproducibility

Open `MediFind_PH_Source_Code_Reproducibility.ipynb` first. This folder
contains the final Configuration D implementation, regression scripts,
dependency manifests, source PDFs, the production Chroma manifest, and the
preserved original experiment notebook and results.

## Included implementation

- `backend/`: FastAPI API, RAG pipeline, catalog, safety gates, and retrieval,
  regression, comparison, formulation, leaflet, and catalog tests.
- `frontend/`: React/Vite source and the production build in `frontend/dist`.
- `data/source_documents/`: the three official MediFind OTC PDF volumes.
- `data/chroma_db/manifest.json`: Configuration D knowledge-base metadata.
- `supporting/`: preserved original experiment notebook and results.

## Latest frontend update

The included frontend source contains the final Home / Ask / New Chat
navigation revision:

- Home is the default view and contains the project overview, features, workflow,
  knowledge-base scope, limitations, and medical disclaimer.
- Ask restores the active conversation and does not create a new conversation.
- New Chat creates its conversation lazily, only after the first message is sent.
- Suggested questions prefill the controlled composer without sending.
- The scope link on Home scrolls to the limitations section.

The API contract, Configuration D values, retrieval pipeline, safety gates, and
catalog data are unchanged.

## Generated files and setup

The submission archive excludes generated environments (`.venv`,
`node_modules`), Python caches, and the generated Chroma index files under
`data/chroma_db` other than `manifest.json`. Restore dependencies with
`backend/requirements.txt` and `frontend/package-lock.json`, then rebuild the
knowledge base with `backend/build_kb.py` as described in the notebook.
