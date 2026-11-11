#!/usr/bin/env python
"""Gaviscon variant-matching regression test - Phase 5 T04.

Run from the backend directory after building the knowledge base:

    python test_gaviscon.py

Covers the T04 issue: "Gaviscon Double Action 10 mL Suspension" must be
answered from the SUSPENSION formulation (500/213/325 mg per 10 mL,
DR-XY43337) - never the chewable-tablet strengths (250/106.5/187.5 mg)
that previously leaked in from a sibling leaflet in top-k=3 retrieval.

Gaviscon is not in the hand-verified record set, so focused queries must
consult the index, narrow to the variant the query describes (or ask
which one is meant when ambiguous), keep conflicting top-k chunks out of
the evidence, and never let the generator state quantities the verified
record does not carry. Configuration D and the T03 enumeration behavior
stay unchanged.
"""

import sys

from rag.config import CHUNK_OVERLAP, CHUNK_SIZE, TOP_K
from rag.formulations import (
    filter_conflicting_hits,
    find_index_matches,
    is_enumeration_query,
    is_formulation_query,
    load_index_records,
    narrow_variants,
)
from rag.pipeline import answer_question

VOL3 = "MediFind_OTC_Vol3_Digestive-Antiseptic-Eye.pdf"

SUSPENSION_Q = (
    "What are the active ingredients and strengths of "
    "Gaviscon Double Action 10 mL Suspension?"
)
CHEWABLE_Q = "What are the strengths of Gaviscon Double Action chewable tablet?"
PLAIN_Q = "Gaviscon 10 mL Oral Suspension"
AMBIGUOUS_Q = "What are the active ingredients of Gaviscon Double Action?"

SUSPENSION_REG = "DR-XY43337"
CHEWABLE_REG = "DR-XY43658"
PLAIN_REG = "DR-XY34746"

ALL_GAVISCON_REGS = {
    "DR-XY35582",
    "DR-XY43658",
    "DR-XY46801",
    "DR-XY34746",
    "DR-XY43337",
}

failures = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global failures
    if condition:
        print(f"  ok   {label}")
    else:
        failures += 1
        print(f"  FAIL {label} {detail}")


def card_regs(response: dict) -> list[str]:
    return [c["registrationNumber"] for c in (response["medicine"] or [])]


def main() -> int:
    print("--- configuration D unchanged ---")
    check("chunk size 800", CHUNK_SIZE == 800, f"got {CHUNK_SIZE}")
    check("overlap 200", CHUNK_OVERLAP == 200, f"got {CHUNK_OVERLAP}")
    check("top-k 3", TOP_K == 3, f"got {TOP_K}")

    print("--- index record parsing (strength vs dosage form) ---")
    by_reg = {r["registrationNumber"]: r for r in load_index_records()}
    susp = by_reg.get(SUSPENSION_REG)
    check("suspension record in index", susp is not None)
    if susp:
        check(
            "suspension strength",
            susp["strength"] == "500 mg/213 mg/325 mg per 10 mL",
            f"got {susp['strength']!r}",
        )
        check(
            "suspension dosage form",
            susp["dosageForm"] == "Suspension",
            f"got {susp['dosageForm']!r}",
        )
        check(
            "suspension brandName",
            susp.get("brandName") == "Gaviscon Double Action",
            f"got {susp.get('brandName')!r}",
        )
        check(
            "suspension own page 56",
            susp["citation"]["page"] == 56,
            f"got {susp['citation']}",
        )
        check(
            "suspension manufacturer",
            susp["manufacturer"] == "RECKITT BENCKISER HEALTHCARE (UK) LIMITED",
            f"got {susp['manufacturer']!r}",
        )
    chew = by_reg.get(CHEWABLE_REG)
    check("chewable record in index", chew is not None)
    if chew:
        check(
            "chewable strength",
            chew["strength"] == "250 mg/106.5 mg/187.5 mg",
            f"got {chew['strength']!r}",
        )
        check(
            "chewable dosage form",
            chew["dosageForm"] == "Chewable Tablet",
            f"got {chew['dosageForm']!r}",
        )
        check(
            "chewable own page 44",
            chew["citation"]["page"] == 44,
            f"got {chew['citation']}",
        )
    plain = by_reg.get(PLAIN_REG)
    check("plain oral suspension record in index", plain is not None)
    if plain:
        check(
            "plain suspension strength",
            plain["strength"] == "500 mg/ 267 mg/ 160 mg per 10 mL",
            f"got {plain['strength']!r}",
        )
        check(
            "plain suspension dosage form",
            plain["dosageForm"] == "Oral Suspension",
            f"got {plain['dosageForm']!r}",
        )
    bio500 = by_reg.get("DR-153")
    check("Biogesic 500 still parses", bio500 is not None)
    if bio500:
        check(
            "Biogesic 500 strength unchanged",
            bio500["strength"] == "500 mg",
            f"got {bio500['strength']!r}",
        )
        check(
            "Biogesic 500 form unchanged",
            bio500["dosageForm"] == "Tablet",
            f"got {bio500['dosageForm']!r}",
        )

    print("--- query detection ---")
    check(
        "T03 query still a formulation query",
        is_formulation_query(
            "What formulations of Biogesic are documented in your knowledge base?"
        ),
    )
    check(
        "suspension query is not a formulation query",
        not is_formulation_query(SUSPENSION_Q),
    )
    check(
        "suspension query is not an enumeration query",
        not is_enumeration_query(SUSPENSION_Q),
    )
    check(
        "ambiguous query is not an enumeration query",
        not is_enumeration_query(AMBIGUOUS_Q),
    )
    check(
        "tell-me-about is an enumeration query",
        is_enumeration_query("Tell me about Biogesic"),
    )
    check(
        "which-products is an enumeration query",
        is_enumeration_query("Which products contain naproxen sodium?"),
    )

    print("--- variant narrowing ---")
    narrowed, signal = narrow_variants(
        SUSPENSION_Q, find_index_matches(SUSPENSION_Q)
    )
    susp_narrow_regs = [m["record"]["registrationNumber"] for m in narrowed]
    check(
        "suspension query narrows to one record",
        susp_narrow_regs == [SUSPENSION_REG],
        f"got {susp_narrow_regs}",
    )
    check("suspension query carries variant detail", signal)

    narrowed, signal = narrow_variants(
        AMBIGUOUS_Q, find_index_matches(AMBIGUOUS_Q)
    )
    amb_regs = sorted(
        m["record"]["registrationNumber"] for m in narrowed
    )
    check(
        "ambiguous query keeps both Double Action variants",
        amb_regs == sorted([SUSPENSION_REG, CHEWABLE_REG]),
        f"got {amb_regs}",
    )
    check("ambiguous query signals variant detail", signal)

    print("--- conflicting-hit filtering ---")
    hits = [
        {
            "content": "FDA Reg. No. DR-XY43658 250 mg/106.5 mg/187.5 mg",
            "source": VOL3,
            "page": 44,
        },
        {
            "content": "Official FDA Philippines registration record "
            "DR-XY43337 500 mg/213 mg/325 mg per 10 mL",
            "source": VOL3,
            "page": 56,
        },
        {
            "content": "Gaviscon Double Action leaflet: take one sachet after "
            "meals. Contains sodium alginate.",
            "source": VOL3,
            "page": 47,
        },
    ]
    kept = filter_conflicting_hits(hits, [susp] if susp else [])
    kept_pages = [h["page"] for h in kept]
    check(
        "foreign-reg and sibling-leaflet hits dropped, own-reg kept",
        kept_pages == [56],
        f"got {kept_pages}",
    )

    print("--- end-to-end: suspension question (the T04 bug) ---")
    response = answer_question(SUSPENSION_Q)
    check("status ok", response["status"] == "ok", response["status"])
    regs = card_regs(response)
    check("exactly the suspension card", regs == [SUSPENSION_REG], f"got {regs}")
    if response["medicine"]:
        card = response["medicine"][0]
        check(
            "card strength is the suspension strength",
            card["strength"] == "500 mg/213 mg/325 mg per 10 mL",
            f"got {card['strength']!r}",
        )
        check(
            "card dosage form is Suspension",
            card["dosageForm"] == "Suspension",
            f"got {card['dosageForm']!r}",
        )
        check(
            "card generic name lists the three actives",
            card["genericName"]
            == "Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate",
            f"got {card['genericName']!r}",
        )
    answer = response["answer"]
    check(
        "answer states the suspension strengths",
        all(x in answer for x in ("500", "213", "325")),
        answer[:300],
    )
    check("answer states the FDA reg. no.", SUSPENSION_REG in answer, answer[:300])
    check(
        "answer has no chewable-tablet strengths",
        "106.5" not in answer and "187.5" not in answer,
        answer[:300],
    )
    pages = {(s["source"], s["page"]) for s in response["sources"]}
    check(
        "suspension page 56 cited",
        (VOL3, 56) in pages,
        f"got {sorted(pages)}",
    )
    check(
        "recognized label names the suspension",
        response["recognized"] is not None
        and "Double Action" in response["recognized"]
        and "500 mg" in response["recognized"],
        response["recognized"],
    )
    check(
        "every cited passage is non-empty",
        all(s["passage"].strip() for s in response["sources"]),
    )

    print("--- end-to-end: chewable question ---")
    response = answer_question(CHEWABLE_Q)
    check("status ok", response["status"] == "ok", response["status"])
    regs = card_regs(response)
    check("exactly the chewable card", regs == [CHEWABLE_REG], f"got {regs}")
    answer = response["answer"]
    check(
        "answer states the chewable strengths",
        all(x in answer for x in ("250", "106.5", "187.5")),
        answer[:300],
    )
    check(
        "answer has no suspension strengths",
        "213" not in answer and "325 mg" not in answer,
        answer[:300],
    )
    pages = {(s["source"], s["page"]) for s in response["sources"]}
    check(
        "chewable page 44 cited",
        (VOL3, 44) in pages,
        f"got {sorted(pages)}",
    )

    print("--- end-to-end: plain oral suspension question ---")
    response = answer_question(PLAIN_Q)
    check("status ok", response["status"] == "ok", response["status"])
    regs = card_regs(response)
    check("exactly the plain suspension card", regs == [PLAIN_REG], f"got {regs}")
    answer = response["answer"]
    check(
        "answer states the plain suspension strengths",
        all(x in answer for x in ("500", "267", "160")),
        answer[:300],
    )
    check(
        "answer has no Double Action strengths",
        "213" not in answer,
        answer[:300],
    )

    print("--- end-to-end: ambiguous Double Action question ---")
    response = answer_question(AMBIGUOUS_Q)
    check(
        "status insufficient_evidence (asks instead of guessing)",
        response["status"] == "insufficient_evidence",
        response["status"],
    )
    regs = sorted(card_regs(response))
    check(
        "both Double Action cards offered",
        regs == sorted([SUSPENSION_REG, CHEWABLE_REG]),
        f"got {regs}",
    )
    check(
        "answer names both FDA reg. nos.",
        SUSPENSION_REG in response["answer"]
        and CHEWABLE_REG in response["answer"],
        response["answer"][:300],
    )
    check(
        "both candidate pages cited",
        (VOL3, 56) in {(s["source"], s["page"]) for s in response["sources"]}
        and (VOL3, 44) in {(s["source"], s["page"]) for s in response["sources"]},
        response["sources"],
    )

    print("--- end-to-end: bare brand keeps enumeration ---")
    response = answer_question("Gaviscon")
    check("status ok", response["status"] == "ok", response["status"])
    regs = set(card_regs(response))
    check(
        "all five Gaviscon records enumerated",
        regs == ALL_GAVISCON_REGS,
        f"got {sorted(regs)}",
    )

    print("--- regression: prior behaviors unchanged ---")
    response = answer_question("Tell me about Biogesic")
    check(
        "bare Biogesic enumerates all four formulations",
        response["status"] == "ok"
        and set(card_regs(response))
        == {"DRP-8763", "DR-153", "DR-XY45639", "DR-XY46366"},
        card_regs(response),
    )
    response = answer_question("Which products contain naproxen sodium?")
    check(
        "ingredient query keeps three cards",
        response["status"] == "ok"
        and set(card_regs(response))
        == {"DR-XY46695", "DR-XY46696", "DRP-1872-02"},
        card_regs(response),
    )

    print()
    if failures:
        print(f"{failures} FAILURE(S)")
        return 1
    print("ALL GAVISCON TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
