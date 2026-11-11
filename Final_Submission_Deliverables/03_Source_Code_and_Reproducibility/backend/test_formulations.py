#!/usr/bin/env python
"""Formulation completeness regression test - Phase 5 T03.

Run from the backend directory after building the knowledge base:

    python test_formulations.py

Covers the T03 issue: a broad brand-formulation question must enumerate
every full product record for that brand from the indexed PDF dataset
(all four Biogesic formulations), not only the hand-verified records or
the chunks inside top-k=3 retrieval - while the normal retrieval path,
Configuration D, dedup rules, and safety handling stay unchanged.
"""

import sys

from rag.config import CHUNK_OVERLAP, CHUNK_SIZE, TOP_K
from rag.formulations import (
    find_index_matches,
    is_formulation_query,
    load_index_records,
    merge_formulation_matches,
)
from rag.pipeline import answer_question
from rag.records import find_medicine_matches

T03_QUERY = "What formulations of Biogesic are documented in your knowledge base?"

# The four individual Biogesic records that must be enumerated.
EXPECTED = {
    "DR-XY45639": {
        "brand": "Biogesic 250 mg / 5 mL Syrup (Orange Flavor)",
        "strength": "250 mg / 5 mL",
        "manufacturer": "Amherst Laboratories, Inc.",
        "page": 6,
    },
    "DR-XY46366": {
        "brand": "Biogesic 250 mg/5mL Syrup (Melon Flavor) Syrup",
        "strength": "250 mg/5mL",
        "manufacturer": "Amherst Laboratories, Inc.",
        "page": 12,
    },
    "DR-153": {
        "brand": "Biogesic 500 mg Tablet",
        "strength": "500 mg",
        "manufacturer": "UNILAB, Inc.",
        "page": 18,
    },
    "DRP-8763": {
        "brand": "Biogesic 325 mg Tablet",
        "strength": "325 mg",
        "manufacturer": "PT Medifarma Laboratories",
        "page": 19,
    },
}

# Formulations that appear ONLY inside embedded registration tables /
# AVAILABILITY lists - they must never become full product records.
TABLE_ONLY_REGS = {"DRHR-1167", "DRHR-1843", "DRHR-1748", "DRHR-1747"}

failures = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global failures
    if condition:
        print(f"  ok   {label}")
    else:
        failures += 1
        print(f"  FAIL {label} {detail}")


def main() -> int:
    print("--- configuration D unchanged ---")
    check("chunk size 800", CHUNK_SIZE == 800, f"got {CHUNK_SIZE}")
    check("overlap 200", CHUNK_OVERLAP == 200, f"got {CHUNK_OVERLAP}")
    check("top-k 3", TOP_K == 3, f"got {TOP_K}")

    print("--- index full-entry parsing ---")
    index_records = load_index_records()
    by_reg = {r["registrationNumber"]: r for r in index_records}
    check(
        "index scan deduped by FDA reg. no.",
        len(by_reg) == len(index_records),
        f"{len(index_records)} records / {len(by_reg)} regs",
    )
    check(
        "table-only mentions are not full records",
        not (TABLE_ONLY_REGS & set(by_reg)),
        f"leaked: {TABLE_ONLY_REGS & set(by_reg)}",
    )
    for reg, expected in EXPECTED.items():
        record = by_reg.get(reg)
        check(f"{reg} present in index records", record is not None)
        if record is None:
            continue
        check(
            f"{reg} brand preserved",
            record["brand"] == expected["brand"],
            f"got {record['brand']!r}",
        )
        check(
            f"{reg} strength preserved",
            record["strength"] == expected["strength"],
            f"got {record['strength']!r}",
        )
        check(
            f"{reg} manufacturer preserved",
            record["manufacturer"] == expected["manufacturer"],
            f"got {record['manufacturer']!r}",
        )
        check(
            f"{reg} own source page",
            record["citation"]["page"] == expected["page"],
            f"got {record['citation']}",
        )
        check(
            f"{reg} dosage form present",
            bool(record.get("dosageForm")),
            "missing dosage form",
        )

    print("--- formulation query detection ---")
    check("T03 query detected", is_formulation_query(T03_QUERY))
    check(
        "focused query not detected",
        not is_formulation_query("What is the generic name of Dolfenal?"),
    )
    check(
        "ingredient query not detected",
        not is_formulation_query("Which products contain naproxen sodium?"),
    )

    print("--- entity matching + merge ---")
    index_matches = find_index_matches(T03_QUERY)
    check(
        "index matching finds all four formulations",
        {m["record"]["registrationNumber"] for m in index_matches} == set(EXPECTED),
        f"got {[m['record']['registrationNumber'] for m in index_matches]}",
    )
    hardcoded = find_medicine_matches(T03_QUERY)
    check(
        "hand-verified records still match the query",
        {m["record"]["registrationNumber"] for m in hardcoded} == {"DRP-8763", "DR-153"},
    )
    merged = merge_formulation_matches(hardcoded, index_matches)
    merged_regs = [m["record"]["registrationNumber"] for m in merged]
    check(
        "merge yields exactly the four unique records",
        sorted(merged_regs) == sorted(EXPECTED),
        f"got {merged_regs}",
    )
    merged_by_reg = {m["record"]["registrationNumber"]: m["record"] for m in merged}
    check(
        "hand-verified records win on collision (stable ids)",
        merged_by_reg["DR-153"]["id"] == "biogesic-500"
        and merged_by_reg["DRP-8763"]["id"] == "biogesic-325",
        f"ids: {merged_by_reg['DR-153']['id']}, {merged_by_reg['DRP-8763']['id']}",
    )

    print("--- end-to-end: T03 query ---")
    response = answer_question(T03_QUERY)
    check("status ok", response["status"] == "ok", response["status"])
    cards = response["medicine"] or []
    card_regs = [c["registrationNumber"] for c in cards]
    check(
        "four medicine cards returned",
        len(cards) == 4,
        f"got {len(cards)}: {card_regs}",
    )
    check(
        "card reg set matches the four records",
        set(card_regs) == set(EXPECTED),
        f"got {card_regs}",
    )
    for card in cards:
        reg = card["registrationNumber"]
        expected = EXPECTED.get(reg)
        if not expected:
            continue
        check(
            f"card {reg} keeps own brand",
            card["brand"] == expected["brand"],
            f"got {card['brand']!r}",
        )
        check(
            f"card {reg} keeps own strength",
            card["strength"] == expected["strength"],
            f"got {card['strength']!r}",
        )
        check(
            f"card {reg} keeps own manufacturer",
            card["manufacturer"] == expected["manufacturer"],
            f"got {card['manufacturer']!r}",
        )
        check(
            f"card {reg} keeps own dosage form",
            bool(card.get("dosageForm")),
            "missing dosage form",
        )
    check(
        "recognized label names every formulation",
        response["recognized"] is not None
        and all(
            by_reg[reg]["brand"] in response["recognized"] for reg in EXPECTED
        ),
        response["recognized"],
    )
    check(
        "answer cites every FDA registration number",
        all(reg in response["answer"] for reg in EXPECTED),
        response["answer"][:200],
    )
    source_pages = {
        s["page"] for s in response["sources"] if s["source"].endswith("Pain-Fever-Muscle.pdf")
    }
    for reg, expected in EXPECTED.items():
        check(
            f"source page {expected['page']} ({reg}) cited",
            expected["page"] in source_pages,
            f"got pages {sorted(source_pages)}",
        )
    check(
        "every cited passage is non-empty",
        all(s["passage"].strip() for s in response["sources"]),
    )

    print("--- regression: normal paths unchanged ---")
    dolfenal = find_medicine_matches("What is the generic name of Dolfenal?")
    check(
        "focused query still returns one record",
        len(dolfenal) == 1 and dolfenal[0]["record"]["id"] == "dolfenal-250",
        [m["record"]["id"] for m in dolfenal],
    )
    bare = answer_question("Tell me about Biogesic")
    check(
        "bare brand query enumerates all four formulations",
        bare["status"] == "ok"
        and {c["registrationNumber"] for c in (bare["medicine"] or [])}
        == {"DRP-8763", "DR-153", "DR-XY45639", "DR-XY46366"},
        [c["registrationNumber"] for c in (bare["medicine"] or [])],
    )
    naproxen = answer_question("Which products contain naproxen sodium?")
    check(
        "ingredient query keeps prior behavior",
        naproxen["status"] == "ok"
        and {c["registrationNumber"] for c in (naproxen["medicine"] or [])}
        == {"DR-XY46695", "DR-XY46696", "DRP-1872-02"},
        [c["registrationNumber"] for c in (naproxen["medicine"] or [])],
    )

    print()
    if failures:
        print(f"{failures} FAILURE(S)")
        return 1
    print("ALL FORMULATION TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
