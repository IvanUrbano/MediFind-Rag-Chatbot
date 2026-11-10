"""Phase 5 T05: comparison questions.

Locks in the previously failed comparison (Gaviscon Double Action
Suspension vs Chewable Tablet) and the comparison intent class:

  * formulation comparison - both formulations represented, distinct
    labeled strengths kept on their own bases, no field mixing
  * medicine-to-medicine comparison across product lines
  * documented indications/structure listed side by side
  * explicit source/evidence questions answered from citation metadata
  * ordinary enumeration/lookup queries are NOT turned into comparisons
"""
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from rag.formulations import find_index_matches
from rag.pipeline import answer_question

failures = 0

VOL1 = "MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf"
VOL3 = "MediFind_OTC_Vol3_Digestive-Antiseptic-Eye.pdf"

SUSPENSION_REG = "DR-XY43337"
CHEWABLE_REG = "DR-XY43658"


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


def cards_by_reg(response: dict) -> dict[str, dict]:
    return {c["registrationNumber"]: c for c in (response["medicine"] or [])}


def source_pages(response: dict) -> set[tuple[str, int]]:
    return {(s["source"], s["page"]) for s in response["sources"]}


def main() -> int:
    print("--- required case: Gaviscon Double Action suspension vs chewable ---")
    question = (
        "Compare Gaviscon Double Action 10 mL Suspension and "
        "Gaviscon Double Action chewable tablet."
    )
    response = answer_question(question)
    answer = response["answer"]
    check("status ok", response["status"] == "ok", response["status"])
    check(
        "both formulations returned as separate cards",
        set(card_regs(response)) == {SUSPENSION_REG, CHEWABLE_REG},
        card_regs(response),
    )
    check(
        "not answered as a clarification",
        "Which one do you mean" not in answer,
        answer[:300],
    )
    check(
        "suspension strength kept verbatim on its basis",
        "500 mg/213 mg/325 mg per 10 mL" in answer,
        answer[:600],
    )
    check(
        "chewable strength kept verbatim",
        "250 mg/106.5 mg/187.5 mg" in answer,
        answer[:600],
    )
    check(
        "dosage forms are labeled separately",
        "Suspension" in answer and "Chewable Tablet" in answer,
        answer[:600],
    )
    check(
        "both FDA reg. nos. appear",
        SUSPENSION_REG in answer and CHEWABLE_REG in answer,
        answer[:600],
    )
    check(
        "shared generic identity reported",
        "Shared:" in answer
        and "Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate" in answer,
        answer[:800],
    )
    check(
        "different measurement bases flagged",
        "not directly interchangeable" in answer,
        answer[-500:],
    )
    check(
        "both record pages cited",
        {(VOL3, 56), (VOL3, 44)} <= source_pages(response),
        source_pages(response),
    )
    cards = cards_by_reg(response)
    check(
        "cards carry their own strengths/forms (no field mixing)",
        cards.get(SUSPENSION_REG, {}).get("strength")
        == "500 mg/213 mg/325 mg per 10 mL"
        and cards.get(SUSPENSION_REG, {}).get("dosageForm") == "Suspension"
        and cards.get(CHEWABLE_REG, {}).get("strength")
        == "250 mg/106.5 mg/187.5 mg"
        and cards.get(CHEWABLE_REG, {}).get("dosageForm") == "Chewable Tablet",
        {reg: (c.get("strength"), c.get("dosageForm")) for reg, c in cards.items()},
    )

    print("--- variant comparison within one brand (named strengths) ---")
    response = answer_question(
        "What is the difference between Biogesic 500 mg and Biogesic 325 mg?"
    )
    answer = response["answer"]
    check("status ok", response["status"] == "ok", response["status"])
    check(
        "only the two named strengths compared",
        set(card_regs(response)) == {"DR-153", "DRP-8763"},
        card_regs(response),
    )
    check(
        "both labeled strengths stated",
        "500 mg" in answer and "325 mg" in answer,
        answer[:500],
    )
    check(
        "shared generic name reported",
        "Shared:" in answer and "Paracetamol" in answer,
        answer[:700],
    )
    check(
        "both record pages cited",
        {(VOL1, 18), (VOL1, 19)} <= source_pages(response),
        source_pages(response),
    )

    print("--- medicine-to-medicine comparison across product lines ---")
    response = answer_question("Compare Dolfenal and Biogesic 500 mg.")
    answer = response["answer"]
    check("status ok", response["status"] == "ok", response["status"])
    check(
        "both products' cards returned",
        "DRP-8716" in card_regs(response)
        and any(reg.startswith(("DR-", "DRP-")) and reg != "DRP-8716"
                for reg in card_regs(response)),
        card_regs(response),
    )
    check(
        "each product line labeled with its generic identity",
        "Mefenamic Acid" in answer and "Paracetamol" in answer,
        answer[:900],
    )
    check(
        "comparison states the active-ingredient difference",
        "active ingredient(s)/generic name" in answer,
        answer[:900],
    )

    print("--- same-ingredient, different-strength product comparison ---")
    response = answer_question("Compare Flanax 220 mg and Flanax 275 mg.")
    answer = response["answer"]
    check(
        "both Flanax strengths compared",
        set(card_regs(response)) == {"DR-XY46695", "DR-XY46696"},
        card_regs(response),
    )
    check(
        "shared naproxen sodium identity reported",
        "Naproxen Sodium" in answer and "Shared:" in answer,
        answer[:700],
    )
    check(
        "both labeled strengths stated",
        "220 mg" in answer and "275 mg" in answer,
        answer[:700],
    )

    print("--- source evidence questions ---")
    response = answer_question("Where is the Dolfenal information documented?")
    answer = response["answer"]
    check("status ok", response["status"] == "ok", response["status"])
    check(
        "record and leaflet pages listed with filenames",
        VOL1 in answer
        and re.search(r"pages?\s+22\b", answer)
        and re.search(r"pages?\s+23\b", answer),
        answer[:700],
    )
    check(
        "citations attached",
        {(VOL1, 22), (VOL1, 23)} <= source_pages(response),
        source_pages(response),
    )

    print("--- comparison intent does not hijack normal questions ---")
    response = answer_question("Tell me about Biogesic")
    check(
        "enumeration stays an enumeration",
        "Side-by-side comparison" not in response["answer"]
        and "Comparison of" not in response["answer"]
        and len(card_regs(response)) == 4,
        response["answer"][:200],
    )
    response = answer_question("What is the generic name of Dolfenal?")
    check(
        "field lookup stays a field answer",
        "Side-by-side comparison" not in response["answer"]
        and card_regs(response) == ["DRP-8716"]
        and "Mefenamic Acid" in response["answer"],
        response["answer"][:300],
    )

    print()
    if failures:
        print(f"{failures} FAILURE(S)")
        return 1
    print("ALL COMPARISON TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
