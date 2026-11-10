"""Leaflet section retrieval: indications/warnings/side effects answers.

Locks in the reported failure ("What is Allerkid 2.5 mg/mL Syrup used
for?" answered "Dosage (FDA Reg. No. DRP-13730)") and the general rules:

  * official-leaflet sections are extracted across all three volumes
  * category questions (indications, contraindications, warnings, side
    effects, storage) are answered from the leaflet, not from a heading
  * a missing structured field is distinguished from a missing leaflet
  * the leaflet is searched before the app claims information is absent
  * multi-formulation leaflets never blend sibling registration numbers
  * no product-specific hardcoding (sections parsed for every leaflet)
"""
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from rag.formulations import (
    leaflet_citations,
    leaflet_owner,
    leaflet_section,
    leaflet_sections,
    load_leaflet_pages,
    load_leaflet_sections,
    regs_in,
)
from rag.pipeline import answer_question

failures = 0

VOL1 = "MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf"
VOL2 = "MediFind_OTC_Vol2_Cold-Cough-Allergy-Throat.pdf"
VOL3 = "MediFind_OTC_Vol3_Digestive-Antiseptic-Eye.pdf"

ALLERKID = "DRP-13730"
DOLFENAL = "DRP-8716"
BIOGESIC_500 = "DR-153"
CANESTEN_CREAM = "DR-XY42700"

ALLERKID_Q = (
    "What is Allerkid 2.5 mg/mL Syrup (Oral Drops) used for "
    "according to its official leaflet?"
)


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


def source_pages(response: dict) -> set[tuple[str, int]]:
    return {(s["source"], s["page"]) for s in response["sources"]}


def main() -> int:
    print("--- section extraction: every leaflet in all three volumes ---")
    sections = load_leaflet_sections()
    leaflets = load_leaflet_pages()
    check(
        "every mapped leaflet yields extracted sections",
        set(sections) == set(leaflets) and len(leaflets) == 20,
        (len(sections), len(leaflets)),
    )
    vol1 = leaflet_section(DOLFENAL, "indications")
    vol2 = leaflet_section(ALLERKID, "indications")
    vol3 = leaflet_section(CANESTEN_CREAM, "indications")
    check(
        "indications extracted from Vol1 leaflet",
        bool(vol1) and "pain" in vol1["text"].lower(),
        vol1 and vol1["text"][:120],
    )
    check(
        "indications extracted from Vol2 leaflet",
        bool(vol2)
        and vol2["source"] == VOL2
        and 4 in vol2["pages"]
        and "allergic rhinitis" in vol2["text"].lower(),
        vol2 and (vol2["source"], vol2["pages"], vol2["text"][:120]),
    )
    check(
        "indications extracted from Vol3 leaflet",
        bool(vol3) and vol3["source"] == VOL3 and len(vol3["text"]) > 40,
        vol3 and (vol3["source"], vol3["text"][:120]),
    )
    check(
        "Allerkid leaflet yields all six categories",
        set(leaflet_sections(ALLERKID))
        == {"indications", "contraindications", "warnings", "side_effects", "dosage", "storage"},
        sorted(leaflet_sections(ALLERKID)),
    )

    print("--- leaflet ownership / multi-formulation separation ---")
    check(
        "leaflet page 4 belongs to Allerkid 2.5 mg/mL",
        leaflet_owner(VOL2, 4) == ALLERKID,
        leaflet_owner(VOL2, 4),
    )
    check(
        "Allerkid registration-record page is not leaflet-owned",
        leaflet_owner(VOL2, 3) is None,
        leaflet_owner(VOL2, 3),
    )

    print("--- reported failure: Allerkid indications from its leaflet ---")
    response = answer_question(ALLERKID_Q)
    answer = response["answer"]
    check(
        "indications answer is the leaflet text, not a heading",
        response["status"] == "ok"
        and "allergic rhinitis" in answer.lower()
        and "conjunctivitis" in answer.lower()
        and "dosage (fda reg" not in answer.lower()
        and len(answer) > 120,
        answer[:400],
    )
    check(
        "indications answer cites the registration and leaflet page",
        "DRP-13730" in answer and (VOL2, 4) in source_pages(response),
        source_pages(response),
    )
    check(
        "multi-formulation leaflet does not leak sibling registration",
        "DRP-13729" not in answer
        and regs_in(answer) <= {ALLERKID}
        and card_regs(response) == [ALLERKID],
        (regs_in(answer), card_regs(response)),
    )
    check(
        "structured card stays structured-only while chat uses leaflet",
        response["medicine"][0].get("indications") is None,
        response["medicine"][0].get("indications"),
    )

    print("--- other information categories ---")
    response = answer_question(
        "When should Allerkid 2.5 mg/mL not be used?"
    )
    check(
        "contraindications answered from the leaflet",
        response["status"] == "ok"
        and "cetirizine" in response["answer"].lower()
        and "kidney" in response["answer"].lower()
        and (VOL2, 4) in source_pages(response),
        response["answer"][:400],
    )
    response = answer_question(
        "What warnings should I know about Allerkid 2.5 mg/mL?"
    )
    check(
        "warnings answered from the leaflet",
        response["status"] == "ok"
        and "kidney or liver" in response["answer"].lower()
        and "ask a doctor" in response["answer"].lower(),
        response["answer"][:400],
    )
    response = answer_question(
        "What are the side effects of Allerkid 2.5 mg/mL?"
    )
    check(
        "side effects answered from the leaflet list",
        response["status"] == "ok"
        and "nausea" in response["answer"].lower()
        and "headache" in response["answer"].lower(),
        response["answer"][:400],
    )
    response = answer_question(
        "How should Allerkid 2.5 mg/mL be stored?"
    )
    check(
        "storage instructions answered from the leaflet",
        response["status"] == "ok"
        and "store at temperatures" in response["answer"].lower()
        and (VOL2, 6) in source_pages(response),
        response["answer"][:400],
    )

    print("--- cross-volume: Dolfenal (Vol1) side effects ---")
    response = answer_question("What are the side effects of Dolfenal?")
    check(
        "Vol1 side effects grounded and not the indications list",
        response["status"] == "ok"
        and card_regs(response) == [DOLFENAL]
        and "dental pain" not in response["answer"].lower()
        and "dysmenorrhea" not in response["answer"].lower(),
        response["answer"][:400],
    )

    print("--- unavailable information: structured vs leaflet ---")
    response = answer_question("What are the side effects of Biogesic 500 mg?")
    check(
        "no-leaflet product reports insufficiency honestly",
        response["status"] == "insufficient_evidence"
        and card_regs(response) == [BIOGESIC_500]
        and "no official leaflet is published" in response["answer"].lower(),
        (response["status"], response["answer"][:300]),
    )
    check(
        "insufficient answer invents no leaflet source",
        not (
            source_pages(response)
            & {
                (cite["source"], cite["page"])
                for cite in leaflet_citations(BIOGESIC_500)
            }
        ),
        source_pages(response),
    )
    response = answer_question("What is Biogesic 250 mg/5 mL Syrup used for?")
    answered_regs = card_regs(response)
    leaflet_regs = [
        reg for reg in answered_regs if leaflet_citations(reg)
    ]
    check(
        "existing leaflet is searched before claiming absence",
        response["status"] in ("ok", "insufficient_evidence")
        and (
            not leaflet_regs
            or "no official leaflet is published" not in response["answer"].lower()
        ),
        (response["status"], answered_regs, response["answer"][:300]),
    )

    print()
    if failures:
        print(f"{failures} check(s) failed")
        return 1
    print("ALL LEAFLET TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
