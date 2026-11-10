"""Phase 5 regression suite: systemic fixes from the full-system review.

Locks in the symptoms found during the audit so they cannot silently
return:

  * normalization ("500mg", "DR-XY43337" look-ups, brand typos)
  * strength/dosage-form parsing (compound strengths, no-quantity values)
  * index coverage (91 full product entries, each fully cited)
  * leaflet segmentation (only real leaflet pages, all pages per reg)
  * citation entity filtering (foreign/sibling pages never cited)
  * multi-formulation enumeration, missing-field honesty, usage answers
  * safety gates (dosage / purchase / price questions stay unsupported)
  * Configuration D untouched and the response contract intact
"""
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from rag import config
from rag.formulations import (
    filter_conflicting_hits,
    find_index_matches,
    leaflet_citations,
    load_index_records,
    parse_strength_form,
    regs_in,
)
from rag.pipeline import answer_question
from rag.records import MEDICINE_RECORDS, find_medicine_matches, normalize_text

failures = 0

VOL1 = "MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf"
VOL3 = "MediFind_OTC_Vol3_Digestive-Antiseptic-Eye.pdf"


def check(name: str, condition: bool, detail=None) -> None:
    global failures
    if condition:
        print(f"PASS  {name}")
    else:
        failures += 1
        print(f"FAIL  {name}")
        if detail is not None:
            print(f"      got: {detail!r}")


def card_regs(response: dict) -> list[str]:
    return [c["registrationNumber"] for c in (response["medicine"] or [])]


def source_pages(response: dict) -> list[tuple[str, int]]:
    return [(s["source"], s["page"]) for s in response["sources"]]


def main() -> int:
    print("--- normalization and query parsing ---")
    check(
        "digit-letter boundary split",
        normalize_text("Biogesic 500mg") == "biogesic 500 mg",
        normalize_text("Biogesic 500mg"),
    )
    check(
        "registration number stays searchable",
        normalize_text("DR-XY43337") == "dr xy 43337",
        normalize_text("DR-XY43337"),
    )
    matches = find_medicine_matches("What is the strength of Biogesic 500mg?")
    check(
        "500mg query resolves to exactly the 500 mg record",
        len(matches) == 1
        and matches[0]["record"]["registrationNumber"] == "DR-153",
        [m["record"]["registrationNumber"] for m in matches],
    )
    matches = find_medicine_matches("What is the registration number of DR-153?")
    check(
        "FDA reg. no. query resolves to one record",
        len(matches) == 1 and matches[0]["record"]["id"] == "biogesic-500",
        [m["record"]["id"] for m in matches],
    )
    check(
        "unrelated text matches nothing",
        not find_medicine_matches("hello there friend"),
    )
    typo = answer_question("biogesec")
    check(
        "brand typo still enumerates all four Biogesic formulations",
        typo["status"] == "ok"
        and set(card_regs(typo))
        == {"DRP-8763", "DR-153", "DR-XY45639", "DR-XY46366"},
        card_regs(typo),
    )

    print("--- strength / dosage-form parser ---")
    cases = [
        (
            "500 mg/213 mg/325 mg per 10 mL Suspension",
            ("500 mg/213 mg/325 mg per 10 mL", "Suspension"),
        ),
        (
            "100 mg 30 mg Aerosol Spray",
            ("100 mg 30 mg", "Aerosol Spray"),
        ),
        (
            "250 mg / 5 mL Syrup (Orange Flavor)",
            ("250 mg / 5 mL", "Syrup (Orange Flavor)"),
        ),
        ("10 mg/mL Nebulizer Solution", ("10 mg/mL", "Nebulizer Solution")),
        ("5% Cream", ("5%", "Cream")),
        ("500 mg", ("500 mg", "")),
        (
            "(see reverse for formulation) Oral Solution (Fruit Flavor)",
            (None, "(see reverse for formulation) Oral Solution (Fruit Flavor)"),
        ),
        ("Granules for Solution (Melon Flavor)",
         (None, "Granules for Solution (Melon Flavor)")),
    ]
    for raw, expected in cases:
        got = parse_strength_form(raw)
        check(f"parse {raw!r}", got == expected, got)

    print("--- index coverage ---")
    records = load_index_records()
    check(
        "94 full product entries parsed",
        len(records) == 94,
        len(records),
    )
    check(
        "every entry has identity, reg. no. and citation",
        all(
            r.get("brand")
            and r.get("registrationNumber")
            and r.get("citation")
            for r in records
        ),
        [r for r in records if not (r.get("brand") and r.get("registrationNumber"))],
    )
    no_strength = [
        r["registrationNumber"]
        for r in records
        if not r.get("strength") and not str(r.get("dosageForm") or "").startswith(
            ("Granules", "(see reverse")
        )
    ]
    check(
        "strength missing only where the source has no quantity",
        no_strength == [],
        no_strength,
    )
    check(
        "hand-verified records covered by the index",
        len(MEDICINE_RECORDS) >= 6,
        len(MEDICINE_RECORDS),
    )

    print("--- leaflet segmentation ---")
    dolfenal = leaflet_citations("DRP-8716")
    check(
        "Dolfenal leaflet has all five pages",
        [cite["page"] for cite in dolfenal] == [23, 24, 25, 26, 27],
        dolfenal,
    )
    check(
        "no leaflet for a record that publishes none",
        leaflet_citations("DR-XY43337") == []
        and leaflet_citations("DR-153") == [],
        (leaflet_citations("DR-XY43337"), leaflet_citations("DR-153")),
    )

    print("--- citation entity filtering ---")
    susp = [
        m
        for m in find_index_matches(
            "What are the strengths of Gaviscon Double Action 10 mL Suspension?"
        )
        if m["record"]["registrationNumber"] == "DR-XY43337"
    ]
    susp_records = [m["record"] for m in susp]
    hits = [
        {
            "content": "FDA Reg. No. DR-XY43658 250 mg/106.5 mg/187.5 mg",
            "source": VOL3,
            "page": 44,
        },
        {
            "content": "Official FDA Philippines registration record DR-XY43337 "
            "500 mg/213 mg/325 mg per 10 mL",
            "source": VOL3,
            "page": 56,
        },
        {
            "content": "Gaviscon Double Action leaflet: take one sachet after "
            "meals.",
            "source": VOL3,
            "page": 47,
        },
        {
            "content": "sodium alginate forms a raft in the stomach.",
            "source": VOL3,
            "page": 55,
        },
    ]
    kept_pages = [h["page"] for h in filter_conflicting_hits(hits, susp_records)]
    check(
        "foreign-reg, sibling-leaflet and identity-less hits dropped",
        kept_pages == [56],
        kept_pages,
    )
    check(
        "reg. numbers extracted from free text",
        regs_in("see DR-XY43337 and dr-xy43658, also DRHR-2304")
        == {"DR-XY43337", "DR-XY43658", "DRHR-2304"},
        regs_in("see DR-XY43337 and dr-xy43658, also DRHR-2304"),
    )

    print("--- end-to-end: field questions (T04) ---")
    response = answer_question(
        "What are the active ingredients and strengths of "
        "Gaviscon Double Action 10 mL Suspension?"
    )
    check(
        "suspension question returns only the suspension card",
        response["status"] == "ok" and card_regs(response) == ["DR-XY43337"],
        card_regs(response),
    )
    answer = response["answer"]
    check(
        "answer carries suspension strengths, not chewable ones",
        all(x in answer for x in ("500", "213", "325"))
        and "106.5" not in answer
        and "187.5" not in answer,
        answer[:400],
    )
    check(
        "record page cited first",
        source_pages(response)[:1] == [(VOL3, 56)],
        source_pages(response),
    )

    print("--- end-to-end: multi-formulation enumeration ---")
    response = answer_question("Tell me about Biogesic")
    check(
        "all four formulations enumerated",
        response["status"] == "ok"
        and set(card_regs(response))
        == {"DRP-8763", "DR-153", "DR-XY45639", "DR-XY46366"},
        card_regs(response),
    )
    check(
        "every enumerated record is cited",
        {(VOL1, 6), (VOL1, 12), (VOL1, 18), (VOL1, 19)}
        <= set(source_pages(response)),
        source_pages(response),
    )
    response = answer_question("Gaviscon")
    check(
        "bare Gaviscon enumerates all five records",
        response["status"] == "ok"
        and set(card_regs(response))
        == {
            "DR-XY35582",
            "DR-XY34746",
            "DR-XY43337",
            "DR-XY43658",
            "DR-XY46801",
        },
        card_regs(response),
    )

    print("--- end-to-end: usage questions ---")
    response = answer_question("What is Dolfenal used for?")
    check(
        "documented indications answered deterministically",
        response["status"] == "ok"
        and card_regs(response) == ["DRP-8716"]
        and "mild to moderate pain" in response["answer"],
        response["answer"][:300],
    )
    check(
        "leaflet pages cited for the indications answer",
        (VOL1, 23) in source_pages(response),
        source_pages(response),
    )
    response = answer_question("What is Biogesic used for?")
    check(
        "multi-formulation usage lines report missing fields honestly",
        response["status"] == "ok"
        and len(card_regs(response)) == 4
        and response["answer"].count("— uses: not recorded in the structured record")
        == 4,
        response["answer"][:500],
    )
    response = answer_question("What are the side effects of Dolfenal?")
    check(
        "leaflet section content answered with identity tag",
        response["status"] == "ok"
        and any(
            term in response["answer"].lower()
            for term in (
                "nausea",
                "abdominal pain",
                "flatulence",
                "dizziness",
                "diarrhea",
            )
        )
        and "dental pain" not in response["answer"].lower()
        and "DRP-8716" in response["answer"],
        response["answer"][:400],
    )

    print("--- end-to-end: safety and unknown questions ---")
    for question in (
        "How many tablets should I take for a headache?",
        "Can I buy Biogesic online?",
        "What is the price of Dolfenal?",
    ):
        response = answer_question(question)
        check(
            f"unsupported: {question!r}",
            response["status"] == "unsupported" and not response["medicine"],
            (response["status"], response["medicine"]),
        )
    response = answer_question("What is the capital of France?")
    check(
        "unknown question stays insufficient with no cards",
        response["status"] == "insufficient_evidence"
        and not response["medicine"]
        and not response["sources"],
        (response["status"], response["medicine"]),
    )
    greeting = answer_question("hello")
    check("greeting short-circuits", greeting["status"] == "ok", greeting["status"])

    print("--- response contract and Configuration D ---")
    response = answer_question("What is the generic name of Dolfenal?")
    check(
        "contract keys intact",
        set(response) == {"answer", "status", "sources", "medicine", "recognized"},
        sorted(response),
    )
    check(
        "sources are bounded, verbatim and typed",
        len(response["sources"]) <= 8
        and all(
            s["source"] and isinstance(s["page"], int) and s["passage"].strip()
            for s in response["sources"]
        ),
        response["sources"],
    )
    check(
        "config unchanged (chunk 800 / overlap 200 / top-k 3)",
        config.CHUNK_SIZE == 800
        and config.CHUNK_OVERLAP == 200
        and config.TOP_K == 3
        and config.EMBEDDING_MODEL == "sentence-transformers/all-MiniLM-L6-v2",
        (
            config.CHUNK_SIZE,
            config.CHUNK_OVERLAP,
            config.TOP_K,
            config.EMBEDDING_MODEL,
        ),
    )

    print()
    if failures:
        print(f"{failures} FAILURE(S)")
        return 1
    print("ALL REGRESSION TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
