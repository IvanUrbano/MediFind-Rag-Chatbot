# Experiment Logs and Checkpoints Deliverable

This folder provides traceable execution evidence for the MediFind PH RAG pipeline:

- `GroupApex_Experiment_Logs_and_Checkpoints.xlsx` — filterable stage logs, document-processing counts, embedding/vector database evidence, retrieval traces, LLM integration details, chatbot evaluation, checkpoint inventory, and warnings.
- `actual_execution_log.txt` — concise verbatim excerpts from the executed notebook and the production checkpoint.
- `checkpoint_manifest.json` — structured checkpoint inventory with SHA-256 hashes and provenance.
- `production_chroma_manifest.json` — exact copy of the current production Chroma manifest.
- `SHA256SUMS.txt` — checksums for the deliverable files (excluding the checksum file itself).

## Important checkpoint distinction

The initial notebook smoke-test checkpoint used chunk size 800 / overlap 120 and indexed 703 chunks. Parameter experiments later selected 800 / 200 / top-k 3. The current production Chroma manifest confirms that selected configuration and 762 chunks.

## Provenance

Actual execution outputs are drawn from `experiments/GroupApex_RAG_Experiment_Notebook.ipynb`, its saved result workbook, and `data/chroma_db/manifest.json`. Notebook cell numbers are recorded in the Excel execution log. No successful result was inferred from source code alone.

Notebook outputs do not store wall-clock timestamps for each cell. The production manifest timestamp and filesystem modification timestamps are preserved where available.