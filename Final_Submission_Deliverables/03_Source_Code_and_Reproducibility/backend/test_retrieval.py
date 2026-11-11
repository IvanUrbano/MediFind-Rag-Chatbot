#!/usr/bin/env python
"""Test retrieval against the nine verified experiment questions - Phase 2.

Run from the backend directory after building the knowledge base:

    python test_retrieval.py

For every question it prints the retrieved chunks with source references
(filename + page) and reports retrieval relevance (precision / recall /
MRR over the top-k), using the same evidence rule as
GroupApex_RAG_Experiment_Notebook.ipynb (page + phrase match).

Reference values (Configuration D, from GroupApex_RAG_Experiment_Results.xlsx):
precision@3 0.2593 | recall@3 0.5370 | MRR@3 0.5926
"""

import time

from rag.config import TOP_K
from rag.retrieval import format_source, retrieve
from rag.storage import get_vectorstore

# ---------- ground truth: nine verified questions (from the experiment notebook) ----------
LAB_TESTS = [
    {"id": "E1", "level": "Easy", "question": "Who manufactures Biogesic 500 mg Tablet?",
     "evidence": [("DR-153", ["unilab"], 18, "Biogesic 500 mg Tablet registration record")]},
    {"id": "E2", "level": "Easy", "question": "What is the generic name of Dolfenal?",
     "evidence": [("DRP-8716", ["mefenamic acid"], 22, "Dolfenal registration record")]},
    {"id": "E3", "level": "Easy", "question": "What is the FDA registration number of Saridon Max?",
     "evidence": [("DRP-1872-02", ["drp-1872-02"], 73, "Saridon Max registration record")]},
    {"id": "A1", "level": "Average", "question": "What is Dolfenal used for?",
     "evidence": [("DRP-8716", ["mild to moderate pain"], 24, "Dolfenal leaflet: used for")]},
    {"id": "A2", "level": "Average",
     "question": "What is the registration number of Flanax 275 mg Film-Coated Tablet?",
     "evidence": [("DR-XY46696", ["dr-xy46696"], 38, "Flanax 275 mg registration record")]},
    {"id": "A3", "level": "Average", "question": "What are the active ingredients of Alaxan?",
     "evidence": [("DR-XY37938", ["ibuprofen + paracetamol"], 4, "Alaxan registration record")]},
    {"id": "D1", "level": "Difficult",
     "question": "Which OTC tablets contain paracetamol 325 mg as the only active ingredient?",
     "evidence": [("DRP-8763", ["325 mg tablet"], 19, "Biogesic 325 registration record"),
                  ("DR-4396", ["325 mg tablet"], 74, "Tempra registration record")]},
    {"id": "D2", "level": "Difficult",
     "question": "Which products contain naproxen sodium, and who manufactures each?",
     "evidence": [("DR-XY46695", ["naproxen sodium"], 33, "Flanax 220 mg registration record"),
                  ("DR-XY46696", ["naproxen sodium"], 38, "Flanax 275 mg registration record"),
                  ("DRP-1872-02", ["naproxen sodium"], 73, "Saridon Max registration record")]},
    {"id": "D3", "level": "Difficult",
     "question": "What is Saridon used for and what are its active ingredients?",
     "evidence": [("DR-XY46456", ["paracetamol + caffeine"], 63, "Saridon registration record"),
                  ("DR-XY46456", ["mild to severe headaches"], 64, "Saridon leaflet: used for")]},
]


def normalize_text(text: str) -> str:
    return " ".join(text.lower().split())


def evaluate_question(test: dict, hits: list[dict]) -> dict:
    """Precision / recall / MRR over retrieved hits (page + phrase rule)."""
    covered: set[int] = set()
    first_relevant_rank = None
    relevant_count = 0

    for rank, hit in enumerate(hits, start=1):
        page = hit.get("page")
        if not isinstance(page, int):
            continue
        body = normalize_text(hit["content"])
        unit_idx = {
            i
            for i, (_reg, phrases, ev_page, _passage) in enumerate(test["evidence"])
            if page == ev_page and any(normalize_text(p) in body for p in phrases)
        }
        covered |= unit_idx
        if unit_idx:
            relevant_count += 1
            if first_relevant_rank is None:
                first_relevant_rank = rank

    k = len(hits) if hits else 1
    return {
        "precision": relevant_count / k,
        "recall": len(covered) / len(test["evidence"]),
        "rr": (1.0 / first_relevant_rank) if first_relevant_rank else 0.0,
        "covered": len(covered),
    }


def main() -> int:
    count = get_vectorstore()._collection.count()
    print("=" * 68)
    print(f"MediFind PH - retrieval test (top-k = {TOP_K}, {count} chunks indexed)")
    print("=" * 68)

    precs, recalls, rrs = [], [], []
    sources_seen: set[str] = set()

    for test in LAB_TESTS:
        started = time.time()
        hits = retrieve(test["question"], k=TOP_K)
        elapsed = time.time() - started
        metrics = evaluate_question(test, hits)

        precs.append(metrics["precision"])
        recalls.append(metrics["recall"])
        rrs.append(metrics["rr"])

        print(f"\n{test['id']} [{test['level']}] {test['question']}")
        if not hits:
            print("  (no chunks retrieved - information missing from the knowledge base)")
            continue
        for rank, hit in enumerate(hits, start=1):
            sources_seen.add(hit["source"])
            snippet = " ".join(hit["content"].split())[:150]
            print(f"  #{rank} {format_source(hit)} | {snippet}...")
        print(
            f"  evidence {metrics['covered']}/{len(test['evidence'])} | "
            f"precision {metrics['precision']:.3f} | recall {metrics['recall']:.3f} | "
            f"rr {metrics['rr']:.3f} | {elapsed:.3f}s"
        )

    print("\n" + "=" * 68)
    print("SUMMARY (retrieval only - no generation)")
    print("=" * 68)
    n = len(LAB_TESTS)
    print(f"Questions tested          : {n}")
    print(f"Mean precision@{TOP_K}       : {sum(precs) / n:.4f}  (Config D reference: 0.2593)")
    print(f"Mean recall@{TOP_K}          : {sum(recalls) / n:.4f}  (Config D reference: 0.5370)")
    print(f"Mean MRR@{TOP_K}             : {sum(rrs) / n:.4f}  (Config D reference: 0.5926)")
    print(f"Source PDFs retrieved     : {len(sources_seen)}")
    for name in sorted(sources_seen):
        print(f"  - {name}")

    # Missing-information probe: retrieval still returns nearest chunks; the
    # generation phase (Phase 3) must refuse to invent an answer from them.
    probe = retrieve("How much does Biogesic cost in Philippine pesos?", k=TOP_K)
    print("\nMissing-information probe: 'How much does Biogesic cost...'")
    for rank, hit in enumerate(probe, start=1):
        print(f"  #{rank} {format_source(hit)}")
    print("  -> nearest chunks only; no price data may be present (do not invent).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
