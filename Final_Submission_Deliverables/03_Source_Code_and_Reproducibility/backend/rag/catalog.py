"""Reusable medicine catalog backed by every full PDF registration record.

This module deliberately reads ``load_index_records()`` instead of RAG
retrieval results. Catalog completeness is therefore independent of top-k and
keeps each FDA registration entry (strength, flavor, and form) separate.
"""

from functools import lru_cache

from rag.formulations import leaflet_section, load_index_records
from rag.records import normalize_text

PDF_CATEGORIES = (
    (
        "Pain, Fever & Muscle",
        "MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf",
    ),
    (
        "Cold, Cough, Allergy & Throat",
        "MediFind_OTC_Vol2_Cold-Cough-Allergy-Throat.pdf",
    ),
    (
        "Digestive, Antiseptic & Eye",
        "MediFind_OTC_Vol3_Digestive-Antiseptic-Eye.pdf",
    ),
)

_CATEGORY_BY_SOURCE = {source: category for category, source in PDF_CATEGORIES}


def _base_catalog_record(record: dict) -> dict:
    citation = dict(record["citation"])
    citation["passage"] = ""
    return {
        "id": record["id"],
        "brand": record["brand"],
        "genericName": record.get("genericName"),
        "activeIngredients": list(record.get("activeIngredients") or []),
        "strength": record.get("strength"),
        "dosageForm": record.get("dosageForm"),
        "pharmacologicCategory": record.get("pharmacologicCategory"),
        "category": _CATEGORY_BY_SOURCE.get(
            citation["source"], "Other documented OTC medicines"
        ),
        "registrationNumber": record.get("registrationNumber"),
        "manufacturer": record.get("manufacturer"),
        "indications": record.get("indications"),
        "citations": [citation],
    }


@lru_cache(maxsize=1)
def catalog_records() -> tuple[dict, ...]:
    """All full PDF product entries, sorted without merging formulations."""
    records = [_base_catalog_record(record) for record in load_index_records()]
    records.sort(
        key=lambda item: (
            str(item.get("brand") or "").casefold(),
            str(item.get("registrationNumber") or "").casefold(),
        )
    )
    return tuple(records)


def catalog_categories() -> list[dict]:
    """PDF-volume categories with live record counts."""
    records = catalog_records()
    return [
        {
            "name": category,
            "source": source,
            "count": sum(record["category"] == category for record in records),
        }
        for category, source in PDF_CATEGORIES
    ]


def search_catalog(query: str = "", category: str = "") -> list[dict]:
    """Search the four supported identity fields and optionally one category."""
    normalized_query = normalize_text(query)
    selected_category = str(category or "").strip().casefold()
    matches: list[dict] = []

    for record in catalog_records():
        if selected_category and record["category"].casefold() != selected_category:
            continue
        if normalized_query:
            searchable = [
                record.get("brand"),
                record.get("genericName"),
                record.get("registrationNumber"),
                *(record.get("activeIngredients") or []),
            ]
            if not any(
                normalized_query in normalize_text(value)
                for value in searchable
                if value
            ):
                continue
        matches.append(dict(record))
    return matches


def get_catalog_record(medicine_id: str) -> dict | None:
    """Detailed record with documented indication text and its PDF pages."""
    base = next(
        (record for record in catalog_records() if record["id"] == medicine_id),
        None,
    )
    if base is None:
        return None

    detail = dict(base)
    detail["activeIngredients"] = list(base["activeIngredients"])
    detail["citations"] = [dict(citation) for citation in base["citations"]]

    section = leaflet_section(detail.get("registrationNumber"), "indications")
    if section:
        detail["indications"] = section["text"]
        seen = {(c["source"], c.get("page")) for c in detail["citations"]}
        for page in section["pages"]:
            key = (section["source"], page)
            if key in seen:
                continue
            detail["citations"].append(
                {
                    "source": section["source"],
                    "page": page,
                    "passage": section["text"],
                }
            )
            seen.add(key)
    return detail
