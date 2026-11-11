import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const out = path.join(root, "Final_Submission_Deliverables");

const mkdir = (p) => fs.mkdirSync(p, {recursive: true});
const copy = (from, to) => {
  mkdir(path.dirname(path.join(out, to)));
  fs.copyFileSync(path.join(root, from), path.join(out, to));
};
const write = (to, value) => {
  const target = path.join(out, to);
  mkdir(path.dirname(target));
  fs.writeFileSync(target, value);
};
const csv = (value) => {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

mkdir(out);

write("01_Final_IEEE_Report/AUTHOR_NAMES_REQUIRED.txt", "The IEEE report generator is ready, but the repository identifies the team only as Group Apex. Supply the exact full author names to generate the required final .docx without inventing authorship.\r\n");

// 02 — preserved completed chunking experiment evidence.
copy(
  "experiments/Chunking_Experiments_Deliverable/GroupApex_Chunking_Experiments.ipynb",
  "02_Chunking_Experiments/GroupApex_Chunking_Experiments.ipynb",
);
copy(
  "experiments/Chunking_Experiments_Deliverable/GroupApex_Chunking_Experiments_Results.xlsx",
  "02_Chunking_Experiments/GroupApex_Chunking_Experiments_Results.xlsx",
);

// 03 — final implementation, source PDFs, manifest, and original experiment evidence.
const sourceDir = path.join(out, "03_Source_Code_and_Reproducibility");
mkdir(sourceDir);
for (const file of [
  "backend/build_kb.py", "backend/main.py", "backend/requirements.txt",
  "backend/test_catalog.py", "backend/test_comparisons.py",
  "backend/test_formulations.py", "backend/test_gaviscon.py",
  "backend/test_leaflets.py", "backend/test_regression.py",
  "backend/test_retrieval.py",
]) copy(file, `03_Source_Code_and_Reproducibility/${file}`);
for (const file of fs.readdirSync(path.join(root, "backend/rag"))) {
  if (file.endsWith(".py")) copy(`backend/rag/${file}`, `03_Source_Code_and_Reproducibility/backend/rag/${file}`);
}
for (const file of ["frontend/index.html", "frontend/package.json", "frontend/package-lock.json", "frontend/vite.config.js"]) {
  copy(file, `03_Source_Code_and_Reproducibility/${file}`);
}
fs.cpSync(path.join(root, "frontend/src"), path.join(sourceDir, "frontend/src"), {
  recursive: true,
  force: true,
});
for (const file of fs.readdirSync(path.join(root, "data/source_documents"))) {
  if (file.toLowerCase().endsWith(".pdf")) {
    copy(`data/source_documents/${file}`, `03_Source_Code_and_Reproducibility/data/source_documents/${file}`);
  }
}
copy("data/chroma_db/manifest.json", "03_Source_Code_and_Reproducibility/data/chroma_db/manifest.json");
copy("experiments/GroupApex_RAG_Experiment_Notebook.ipynb", "03_Source_Code_and_Reproducibility/supporting/GroupApex_RAG_Experiment_Notebook.ipynb");
copy("experiments/GroupApex_RAG_Experiment_Results.xlsx", "03_Source_Code_and_Reproducibility/supporting/GroupApex_RAG_Experiment_Results.xlsx");

const md = (text) => ({cell_type: "markdown", metadata: {}, source: text.split(/(?<=\n)/)});
const code = (text) => ({cell_type: "code", execution_count: null, metadata: {}, outputs: [], source: text.split(/(?<=\n)/)});
const notebook = {
  cells: [
    md("# MediFind PH — Source Code and Reproducibility\n\nThis notebook is the entry point for reproducing the final application using **Configuration D**. The complete FastAPI, React, ChromaDB, entity-normalization, retrieval, citation, and safety code is included beside this notebook.\n"),
    md("## Frozen final configuration\n\n- Knowledge base: the three official MediFind OTC PDF volumes (94 records; 226 extracted PDF pages)\n- Chunk size: **800 characters**\n- Chunk overlap: **200 characters**\n- Retrieval depth: **top-k 3**\n- Embeddings: `sentence-transformers/all-MiniLM-L6-v2`\n- Vector store: ChromaDB (`medifind_otc`)\n- Generator: `google/flan-t5-base`\n- API: FastAPI; frontend: React/Vite\n"),
    code("from pathlib import Path\nimport json\n\nROOT = Path.cwd()\nmanifest = json.loads((ROOT / 'data/chroma_db/manifest.json').read_text(encoding='utf-8'))\nmanifest\n"),
    md("## 1. Install backend dependencies\n\nRun from the `03_Source_Code_and_Reproducibility` directory. Model downloads require internet access on the first run.\n"),
    code("# In a terminal (Windows PowerShell):\n# cd backend\n# python -m venv .venv\n# .\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt\n"),
    md("## 2. Rebuild the vector database\n\n`build_kb.py` reads all three PDFs and uses the frozen values in `rag/config.py`. Rebuilding should yield 762 chunks when the supplied PDFs and dependency behavior are unchanged.\n"),
    code("# In a terminal from backend/:\n# .\\.venv\\Scripts\\python.exe build_kb.py\n"),
    md("## 3. Start and verify the API\n"),
    code("# Start from backend/:\n# .\\.venv\\Scripts\\python.exe -m uvicorn main:app --reload --port 8000\n\n# Then verify from Python:\nimport requests\nhealth = requests.get('http://127.0.0.1:8000/api/health', timeout=30).json()\nhealth\n"),
    code("payload = {'message': 'What is the generic name of Dolfenal?'}\nresponse = requests.post('http://127.0.0.1:8000/api/chat', json=payload, timeout=120).json()\nresponse\n"),
    md("## 4. Run backend regression suites\n\nThese cover catalog integrity, formulation narrowing, comparisons, warning/leaflet sections, citations, retrieval, safety gates, and the Configuration D invariant.\n"),
    code("# In a terminal from backend/:\n# .\\.venv\\Scripts\\python.exe test_catalog.py\n# .\\.venv\\Scripts\\python.exe test_formulations.py\n# .\\.venv\\Scripts\\python.exe test_gaviscon.py\n# .\\.venv\\Scripts\\python.exe test_comparisons.py\n# .\\.venv\\Scripts\\python.exe test_leaflets.py\n# .\\.venv\\Scripts\\python.exe test_retrieval.py\n# .\\.venv\\Scripts\\python.exe test_regression.py\n"),
    md("## 5. Start the React frontend\n"),
    code("# In a second terminal from frontend/:\n# npm ci\n# npm run dev\n"),
    md("## 6. Re-run the fixed chatbot evaluation suite\n\nFrom the repository root, run `node experiments/Chatbot_Accuracy_Evaluation_Deliverable/run_evaluation.mjs` only while the intended API version is running. The included submission results are the preserved baseline live run and must not be relabeled as post-fix evidence. Final Phase 5 manual testing remains the responsibility of the researchers.\n"),
  ],
  metadata: {
    kernelspec: {display_name: "Python 3", language: "python", name: "python3"},
    language_info: {name: "python", version: "3.x"},
  },
  nbformat: 4,
  nbformat_minor: 5,
};
write("03_Source_Code_and_Reproducibility/MediFind_PH_Source_Code_Reproducibility.ipynb", JSON.stringify(notebook, null, 2));

// 04 — actual execution evidence and its source notebook/results.
for (const file of [
  "GroupApex_Experiment_Logs_and_Checkpoints.xlsx", "actual_execution_log.txt",
  "checkpoint_manifest.json", "production_chroma_manifest.json", "README.md", "SHA256SUMS.txt",
]) copy(`experiments/Experiment_Logs_and_Checkpoints_Deliverable/${file}`, `04_Experiment_Logs_and_Checkpoints/${file}`);
copy("experiments/GroupApex_RAG_Experiment_Notebook.ipynb", "04_Experiment_Logs_and_Checkpoints/supporting/GroupApex_RAG_Experiment_Notebook.ipynb");
copy("experiments/GroupApex_RAG_Experiment_Results.xlsx", "04_Experiment_Logs_and_Checkpoints/supporting/GroupApex_RAG_Experiment_Results.xlsx");

// 05 — preserved 36-case baseline evaluation, plus the required CSV view.
for (const file of [
  "MediFind_PH_Chatbot_Response_Accuracy_Evaluation.xlsx",
  "MediFind_PH_Chatbot_Response_Accuracy_Evaluation_Report.md",
  "automated_results.json", "raw_api_results.json", "reviewed_results.json",
  "run_evaluation.mjs", "test_cases.json", "README.md", "SHA256SUMS.txt",
]) copy(`experiments/Chatbot_Accuracy_Evaluation_Deliverable/${file}`, `05_Chatbot_Response_Evaluation/${file}`);
const reviewed = JSON.parse(fs.readFileSync(path.join(root, "experiments/Chatbot_Accuracy_Evaluation_Deliverable/reviewed_results.json"), "utf8"));
const columns = [
  "test_id", "type", "volume", "question", "expected_answer", "actual_answer",
  "api_status", "sources", "automated_result", "engineer_result", "relevance",
  "factual_accuracy", "completeness", "formulation_matching", "citation_accuracy",
  "medical_safety", "explanation", "identified_issue", "recommended_fix",
];
const csvRows = [
  ["evaluation_phase", ...columns].map(csv).join(","),
  ...reviewed.rows.map((row) => ["Preserved baseline live API run (before systemic fixes)", ...columns.map((key) => row[key])].map(csv).join(",")),
];
write("05_Chatbot_Response_Evaluation/MediFind_PH_Chatbot_Response_Evaluation.csv", `\uFEFF${csvRows.join("\r\n")}\r\n`);

write("02_Chunking_Experiments/README.md", "# Chunking Experiments\n\nFive documented runs are included. A–D hold top-k at 3; E is a top-k sensitivity control. Configuration D (800/200/top-k 3) was selected because it achieved the best MRR@3 (0.5926) and best recorded answer quality (3/9) among the tested configurations. The notebook contains saved execution outputs; the workbook contains the configuration comparison and 45 question-level rows.\n");
write("03_Source_Code_and_Reproducibility/README.md", "# Source Code and Reproducibility\n\nOpen `MediFind_PH_Source_Code_Reproducibility.ipynb` first. This folder contains the final FastAPI/React RAG implementation, regression scripts, dependency manifests, three source PDFs, the production Configuration D manifest, and preserved original experiment notebook/results. Generated environments (`.venv`, `node_modules`) are intentionally excluded and must be restored from the dependency files.\n");
write("05_Chatbot_Response_Evaluation/README_SUBMISSION.md", "# Chatbot Response Evaluation\n\nThis deliverable contains 36 live-API cases (more than the required 10), including answerable, unknown-medicine, missing-information, and medically unsupported requests. Expected answers were built from the three PDFs. The automated baseline was 30 PASS and 6 FAIL; stricter engineer review was 19 PASS, 14 PARTIAL PASS, and 3 FAIL. These are preserved baseline results, not post-fix claims. The user's final Phase 5 manual testing is not marked complete.\n");

const matrix = [
  ["No.", "Deliverable", "Required types", "Included evidence", "Status"],
  ["1", "Final Draft of IEEE Report", ".docx", "Awaiting authoritative author list before generation", "PENDING AUTHORS"],
  ["2", "Chunking Experiments", ".ipynb, .xlsx", "5 configurations; saved outputs; 45 question rows; selection justification", "COMPLETE"],
  ["3", "Source Code and Reproducibility", ".ipynb and supporting files", "Configuration D notebook; backend; frontend; PDFs; manifests; tests", "COMPLETE"],
  ["4", "Experiment Logs and Checkpoints", ".xlsx and supporting files", "9-sheet log workbook; raw log; manifests; original executed notebook/results", "COMPLETE"],
  ["5", "Chatbot Response Evaluation", ".csv, .xlsx", "36 baseline live-API tests; answerable and unanswerable; expected/actual/review", "COMPLETE"],
];
write("DELIVERABLE_VERIFICATION_MATRIX.csv", matrix.map((row) => row.map(csv).join(",")).join("\r\n") + "\r\n");

write("README.md", "# MediFind PH — Final Submission Deliverables\n\nThis folder is organized to match the five required deliverables. Results are evidence-labeled: original experiment outputs and the live baseline chatbot evaluation are preserved; no post-fix pass rate is claimed without a fresh executed run. Configuration D remains 800-character chunks, 200-character overlap, and top-k 3.\n\nSee `DELIVERABLE_VERIFICATION_MATRIX.csv` for the file/type check. Deliverable 1 remains pending only because the repository does not contain the authoritative full author list.\n");

// Checksums for every generated/copied file except the checksum file itself.
function filesUnder(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}
const checksumLines = filesUnder(out)
  .filter((file) => path.basename(file) !== "SHA256SUMS.txt")
  .sort()
  .map((file) => `${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase()}  ${path.relative(out, file).replaceAll("\\", "/")}`);
write("SHA256SUMS.txt", checksumLines.join("\r\n") + "\r\n");

console.log(`Built ${out}`);
console.log(`Files: ${filesUnder(out).length}`);
