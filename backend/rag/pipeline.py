"""Phase 3 RAG pipeline: normalize -> retrieve -> generate -> assemble.

Contract returned by ``answer_question`` (matches the frontend
``src/api/client.js`` expectation):

    {answer, status, sources, medicine, recognized}

- ``status``: "ok" | "insufficient_evidence" | "unsupported"
- ``sources``: verbatim passages fetched from the Chroma index only -
  a citation is emitted only when its text could actually be retrieved,
  so nothing is ever fabricated.
- ``medicine``: verified card records for matched entities (or None).
"""

import re

from rag import generation
from rag.config import PASSAGE_MAX_CHARS, TOP_K
from rag.formulations import (
    filter_conflicting_hits,
    find_index_matches,
    is_enumeration_query,
    leaflet_citations,
    leaflet_section,
    leaflet_sections,
    merge_formulation_matches,
    narrow_variants,
    quantity_pairs,
    regs_in,
    select_mentioned_quantities,
)
from rag.records import (
    card_view,
    find_medicine_matches,
    normalize_text,
    recognized_label,
)
from rag.retrieval import retrieve
from rag.storage import get_vectorstore

# ---------- Safety gates (Phase 3 exclusions) ----------
UNSUPPORTED_PATTERNS = [
    # diagnosis
    r"\b(diagnos|do i have|what disease|what illness|am i sick)\w*",
    # prescriptions / personalized dosing / overdose / self-medication
    r"\b(prescrib|should i take|recommend(?:ed)? (?:dose|dosage)|dosage for me|"
    r"how (?:many|much) (?:mg|tablets?|capsules?) should|"
    r"how (?:many|much) should|do i give|self[- ]medicat|overdose)\w*",
    # prices / discounts / pharmacy availability
    r"\b(price|prices|pricing|cost|how much does|where (?:can i|to) buy|"
    r"available at|in stock|sale|discounts?|promo|voucher|magkano|drugstore|"
    r"buy|purchase)\w*",
]

# Section-oriented questions answered from verified fields only (no model).
_FIELD_QUESTION = re.compile(
    r"\b(?:generic name|active ingredients?|ingredients?|strengths?|"
    r"dosage forms?|manufacturer|registration(?: number)?|fda reg|"
    r"pharmacologic category|classification|composition)\b",
    re.I,
)

# Use / indication / directions questions that leaflet evidence may answer.
_USAGE_QUESTION = re.compile(
    r"\b(?:used for|uses?|indications?|treat(?:s|ment|ed|ing)?|"
    r"how do i take|how should i take|dosage|directions?|warnings?|"
    r"side effects?|interact(?:s|ion|ions|ing)?|contraindications?|"
    r"stor(?:e|age|ing|ed)|keep this medicine|"
    r"not (?:be )?(?:used|taken)|should not (?:take|use|be used))\b",
    re.I,
)

# Comparison questions: two or more products / formulations set side by side.
_COMPARISON_QUESTION = re.compile(
    r"\bcompare\b|\bcomparison\b|\bvs\.?\b|\bversus\b|"
    r"\bdifferences?\s+between\b|\bdiffers?\b|"
    r"\bhow\s+do(?:es)?\s+.+?\s+differ\b",
    re.I,
)

# Explicit "show me the evidence" questions answered from citation metadata.
_SOURCE_QUESTION = re.compile(
    r"\b(?:show|give|list|find)\b[^.?!]*\b(?:sources?|pages?|leaflets?|citations?)\b|"
    r"\bwhich\s+(?:page|source|pdf|volume)\b|"
    r"\bwhere\s+(?:is|are|was|were|does|do)\b[^.?!]*"
    r"\b(?:documented|stated|mentioned|recorded|found)\b|"
    r"\bsource\s+evidence\b",
    re.I,
)

# Leaflet information categories answerable by section-aware extraction.
# Order matters: narrower intents first ("when should you not take ..."
# is a contraindication, not a generic usage question).
_SECTION_INTENT_PATTERNS = (
    (
        "contraindications",
        re.compile(
            r"\bcontraindicat|when should you not take|"
            r"when should you not use|who should not (?:take|use)|"
            r"\bnot (?:be )?(?:used|taken)\b|should not (?:take|use|be used)",
            re.I,
        ),
    ),
    (
        "warnings",
        re.compile(
            r"\bwarnings?\b|\bprecautions?\b|consult your doctor|"
            r"care that should be taken",
            re.I,
        ),
    ),
    (
        "side_effects",
        re.compile(
            r"\bside[- ]effects?\b|\badverse (?:drug )?(?:effects?|reactions?)\b|"
            r"\bundesirable effects?\b",
            re.I,
        ),
    ),
    (
        "storage",
        re.compile(r"\bstor(?:e|age|ing|ed)\b|keep this medicine", re.I),
    ),
    (
        "dosage",
        re.compile(
            r"\bdosage\b|\bdirections?\b|how (?:do|should) i (?:take|use)|"
            r"how much .*(?:take|use)",
            re.I,
        ),
    ),
    (
        "indications",
        re.compile(
            r"\bused for\b|\buses?\b|\bindications?\b|"
            r"\btreat(?:s|ment|ed|ing)?\b|what is .+ for|what does .+ treat",
            re.I,
        ),
    ),
)

_SECTION_LABELS = {
    "indications": "documented indications",
    "contraindications": "contraindications (when the medicine should not be used)",
    "warnings": "warnings and precautions",
    "side_effects": "reported undesirable effects",
    "dosage": "how much and how often the medicine is used",
    "storage": "storage instructions",
}
_SECTION_ANSWER_MAX_CHARS = 700


def _section_intent(text: str) -> str | None:
    """Leaflet section category the question asks about, if any."""
    for kind, pattern in _SECTION_INTENT_PATTERNS:
        if pattern.search(text):
            return kind
    return None

GREETING = re.compile(
    r"^(hi|hello|hey|good (morning|afternoon|evening)|kumusta|magandang araw)\b",
    re.I,
)
ABOUT = re.compile(
    r"\b(about medifind|what is medifind|who are you|how do you work|what can you do)\b",
    re.I,
)

UNSUPPORTED_ANSWER = (
    "MediFind PH can't help with that request. I don't provide diagnoses, "
    "prescriptions, personalized dosage recommendations, or price and "
    "availability information. I can share general OTC medicine information "
    "documented in the MediFind source leaflets — for example a brand’s "
    "generic name, active ingredients, manufacturer, or FDA registration number."
)

GREETING_ANSWER = (
    "Hello! I'm the MediFind PH assistant. I answer questions about Philippine OTC "
    "medicines using the MediFind source leaflets (Volumes 1–3).\n\n"
    "Try one of the example questions, or ask about a specific brand such as "
    "Biogesic, Dolfenal, Flanax, Saridon, Tempra, or Alaxan."
)

ABOUT_ANSWER = (
    "MediFind PH is a retrieval-augmented generation (RAG) chatbot that answers "
    "questions about Philippine OTC medicines using the MediFind OTC leaflet "
    "volumes as its only source. It reports what the documents record and shows "
    "the exact filename and page for every claim so you can verify it.\n\n"
    "It does not replace professional medical advice."
)

INSUFFICIENT_ANSWER = (
    "I could not find enough information in the source documents to answer that "
    "question. Try naming a specific OTC brand from the MediFind leaflets — for "
    "example Biogesic, Dolfenal, Flanax, Saridon, Tempra, or Alaxan — and ask "
    "about its generic name, active ingredients, manufacturer, registered "
    "indications, or FDA registration number."
)

EMPTY_ANSWER = "Please enter a question."

# Words too generic to prove (or disprove) grounding of an answer.
_STOPWORDS = frozenset(
    """
    the and for with this that these those from are was were you your can
    cant not have has had any all what which who whom how when where why
    does did into than then them they their there our out get got may one
    two also please answer question document documents source sources
    evidence using only based above below given shown listed reply exactly
    enough information contain contains include includes such each more
    most some other been being will would could should about after before
    between during under over again very just its it's
    """.split()
)

_SALIENT_RE = re.compile(r"[a-z0-9][a-z0-9-]{2,}")


def _tidy(answer: str, truncated: bool = False) -> str:
    """Repair a generation that hit the token cap mid-sentence."""
    a = answer.strip()
    if not truncated:
        return a
    for sep in (". ", "! ", "? "):
        idx = a.rfind(sep)
        if idx >= 60:
            return a[: idx + 1].strip()
    if " " in a:  # drop a dangling partial word
        a = a.rsplit(" ", 1)[0].rstrip(",;:-")
    return a + "…"


def _grounded(answer: str, evidence_text: str) -> bool:
    """True when most content words of ``answer`` appear in the evidence.

    Guards against parametric-knowledge answers (e.g. "Paris" for a capital
    question) that flan-t5 produces even when instructed to refuse.
    """
    salient = [
        t for t in _SALIENT_RE.findall((answer or "").lower())
        if t not in _STOPWORDS
    ]
    if not salient:
        return True  # nothing checkable (e.g. pure numeric/short answers)
    lowered = evidence_text.lower()
    hits = sum(1 for t in salient if t in lowered)
    return hits / len(salient) >= 0.5


def _response(
    answer: str,
    status: str,
    sources: list[dict] | None = None,
    medicine: list[dict] | None = None,
    recognized: str | None = None,
) -> dict:
    return {
        "answer": answer,
        "status": status,
        "sources": sources or [],
        "medicine": medicine,
        "recognized": recognized,
    }


def _is_unsupported(text: str) -> bool:
    return any(re.search(p, text, re.I) for p in UNSUPPORTED_PATTERNS)


def _fetch_page_passage(
    source: str,
    page_1based: int,
    query: str,
    prefer_reg: str | None = None,
) -> str | None:
    """Verbatim passage for one (file, page) from the existing index.

    Prefers a chunk on that page containing ``prefer_reg`` when given (the
    page may hold several products' text); otherwise the best-matching
    chunk for the question wins. Returns None when the page is not indexed
    (e.g. an empty/scanned page) so the caller can skip the citation
    instead of inventing a passage.
    """
    try:
        docs = get_vectorstore().similarity_search(
            query,
            k=3,
            filter={
                "$and": [
                    {"source": {"$eq": source}},
                    {"page": {"$eq": page_1based - 1}},
                ]
            },
        )
    except Exception:
        return None
    if not docs:
        return None
    chosen = docs[0]
    if prefer_reg:
        wanted = prefer_reg.upper()
        for doc in docs:
            if wanted in doc.page_content.upper():
                chosen = doc
                break
    passage = " ".join(chosen.page_content.split())
    return passage[:PASSAGE_MAX_CHARS] or None


def _leaflet_blocks(records: list[dict], query: str) -> list[str]:
    """Leaflet evidence for the matched records.

    Registration-record pages are excluded (they are cited separately).
    When the question names an information category, that extracted
    section leads (and is the only section included) so the generator is
    not biased by other categories; otherwise all extracted sections come
    first because headings and answers can span chunk boundaries. Page
    chunks follow as supporting passages.
    """
    own: set[tuple] = set()
    for record in records:
        for cite in [record.get("citation")] + list(
            record.get("extra_citations") or []
        ):
            if cite:
                own.add((cite.get("source"), cite.get("page")))
    wanted = _section_intent(query)
    blocks: list[str] = []
    for record in records:
        registration = record.get("registrationNumber")
        if not registration:
            continue
        leaflet = leaflet_sections(registration)
        kinds = [wanted] if wanted in leaflet else list(leaflet)
        for kind in kinds:
            section = leaflet[kind]
            page_bit = ", ".join(str(p) for p in section["pages"])
            blocks.append(
                f"[Leaflet section {registration} ({kind}): "
                f"{section['source']}, page {page_bit}]\n{section['text']}"
            )
        cites = [
            cite
            for cite in leaflet_citations(registration)
            if (cite["source"], cite["page"]) not in own
        ]
        if wanted in leaflet:
            wanted_section = leaflet[wanted]
            lead = [
                cite
                for cite in cites
                if cite["source"] == wanted_section["source"]
                and cite["page"] in wanted_section["pages"]
            ]
            cites = lead + [cite for cite in cites if cite not in lead]
        for cite in cites[:2]:
            passage = _fetch_page_passage(cite["source"], cite["page"], query)
            if passage:
                blocks.append(
                    f"[Leaflet {registration}: {cite['source']}, "
                    f"page {cite['page']}]\n{passage}"
                )
    return blocks


def _assemble_sources(matches: list[dict], hits: list[dict]) -> list[dict]:
    """Citation list: verified record pages, leaflet pages, retrieved chunks.

    Every passage comes straight from Chroma; duplicates by (file, page)
    keep their first (highest-priority) occurrence.
    """
    sources: list[dict] = []
    seen: set[tuple] = set()

    for match in matches:
        record = match["record"]
        citations = [record.get("citation")] + list(
            record.get("extra_citations") or []
        )
        query = f"{record['brand']} {record['genericName']}"
        registration = record.get("registrationNumber")
        for cite in citations:
            if not cite:
                continue
            key = (cite["source"], cite["page"])
            if key in seen:
                continue
            passage = _fetch_page_passage(
                cite["source"], cite["page"], query, prefer_reg=registration
            )
            if passage is None:
                continue
            seen.add(key)
            sources.append(
                {"source": cite["source"], "page": cite["page"], "passage": passage}
            )

    for match in matches:
        record = match["record"]
        registration = record.get("registrationNumber")
        if not registration:
            continue
        query = f"{record['brand']} {record['genericName']}"
        for cite in leaflet_citations(registration):
            key = (cite["source"], cite["page"])
            if key in seen:
                continue
            passage = _fetch_page_passage(
                cite["source"], cite["page"], query, prefer_reg=registration
            )
            if passage is None:
                continue
            seen.add(key)
            sources.append(
                {"source": cite["source"], "page": cite["page"], "passage": passage}
            )

    for hit in hits:
        source = hit.get("source")
        page = hit.get("page")
        if not source or (source, page) in seen:
            continue
        passage = " ".join(str(hit.get("content") or "").split())[:PASSAGE_MAX_CHARS]
        if not passage:
            continue
        seen.add((source, page))
        sources.append({"source": source, "page": page, "passage": passage})

    return sources[:8]


def _record_block(record: dict) -> str:
    """Verified record fields as an evidence block for the generator."""
    lines = [f"Verified record: {record['brand']}"]
    ingredients = " + ".join(record.get("activeIngredients") or [])
    fields = [
        ("Generic name", record.get("genericName")),
        ("Active ingredients", ingredients),
        ("Strength", record.get("strength")),
        ("Dosage form", record.get("dosageForm")),
        ("FDA Reg. No.", record.get("registrationNumber")),
        ("Manufacturer", record.get("manufacturer")),
        ("Pharmacologic category", record.get("pharmacologicCategory")),
        ("Documented indications", record.get("indications")),
    ]
    for label, value in fields:
        if value:
            lines.append(f"{label}: {value}")
    return "\n".join(lines)


def _retrieval_block(index: int, hit: dict) -> str:
    page = f", page {hit['page']}" if hit.get("page") else ""
    return f"[Source {index}: {hit.get('source', 'unknown')}{page}]\n{hit['content']}"


_MISSING = "not recorded in the structured record"


def _clip(text: str, limit: int) -> str:
    """Collapse whitespace and clip at a word boundary."""
    text = " ".join(str(text or "").split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(" ,;:") + "…"


def _indications_text(record: dict) -> str | None:
    """Indications from the structured record, else from its leaflet.

    The structured registration entry and the official leaflet are both
    source documents; when the structured field is absent the leaflet
    section is the documented evidence (never an assumption).
    """
    structured = record.get("indications")
    if structured:
        return structured
    section = leaflet_section(record.get("registrationNumber"), "indications")
    return _clip(section["text"], 300) if section else None


def _side_field(record: dict, key: str) -> str:
    """Comparison attribute value (indications fall back to the leaflet)."""
    if key == "indications":
        return _indications_text(record) or ""
    return str(record.get(key) or "")


def _substantive_answer(answer: str) -> bool:
    """False for heading-like fragments ("Dosage") that answer nothing."""
    words = [
        word
        for word in re.findall(r"[A-Za-z][A-Za-z'-]+", str(answer or ""))
        if len(word) >= 3
    ]
    return len(words) >= 2


def _section_quality(text: str) -> bool:
    """True when an extracted section reads as coherent prose.

    Multi-column OCR interleaves neighbouring columns; such fragments
    start mid-sentence, break parentheses, or replay chunk-overlap text.
    Clean sections may be quoted deterministically; other material stays
    as generator evidence only.
    """
    body = _clip(text, _SECTION_ANSWER_MAX_CHARS)
    if not body or not body[0].isupper():
        return False
    if body.count("(") != body.count(")"):
        return False
    if re.search(r"\)\s*[a-z]|^[\s,;:.()\-]", body):
        return False
    words = body.split()
    if len(words) > 24:
        shingles = [" ".join(words[i : i + 8]) for i in range(len(words) - 8)]
        if len(set(shingles)) <= len(shingles) * 0.75:
            return False
    return True


def _section_answer(record: dict, kind: str, section: dict) -> str:
    """Deterministic answer quoting one extracted official-leaflet section."""
    registration = record.get("registrationNumber")
    pages = section["pages"]
    page_text = (
        f"page {pages[0]}"
        if len(pages) == 1
        else f"pages {pages[0]}–{pages[-1]}"
    )
    return (
        f"{record['brand']} — from its official leaflet, "
        f"{_SECTION_LABELS.get(kind, kind)}: "
        f"{_clip(section['text'], _SECTION_ANSWER_MAX_CHARS)} "
        f"(FDA Reg. No. {registration}; {section['source']}, {page_text}). "
        "The verbatim passages are cited below."
    )


def _section_limitation_answer(record: dict, kind: str, section: dict) -> str:
    """Honest answer when OCR layout prevents a reliable quote."""
    registration = record.get("registrationNumber")
    pages = ", ".join(str(p) for p in section["pages"])
    return (
        f"The official leaflet for {record['brand']} "
        f"(FDA Reg. No. {registration}) covers "
        f"{_SECTION_LABELS.get(kind, kind)} on {section['source']}, "
        f"page {pages}, but the OCR transcription interleaves columns and "
        "cannot be quoted reliably. The verbatim leaflet passages are "
        "cited below."
    )


_CONTENT_STOPWORDS = {
    "that", "this", "with", "from", "have", "were", "they", "their",
    "there", "which", "including", "include", "includes", "other", "such",
    "using", "used", "use", "into", "than", "then", "when", "where",
    "what", "will", "would", "should", "could", "your", "yours", "about",
    "also", "more", "most", "less", "very", "some", "only", "not",
}


def _content_words(text: str) -> set[str]:
    """Distinctive lowercase content words (len >= 4, stopwords removed)."""
    return {
        word
        for word in re.findall(r"[a-z][a-z'-]+", str(text or "").lower())
        if len(word) >= 4 and word not in _CONTENT_STOPWORDS
    }


def _mostly_indications(candidate: str, record: dict, kind: str) -> bool:
    """True when a non-indications answer is really the indications text."""
    if kind in ("indications", None):
        return False
    indications = _content_words(
        " ".join(
            part
            for part in (
                record.get("indications") or "",
                (leaflet_section(record.get("registrationNumber"), "indications") or {}).get("text", ""),
            )
            if part
        )
    )
    words = _content_words(candidate)
    if not indications or not words:
        return False
    return len(words & indications) / len(words) >= 0.6


_KIND_TERMS = {
    "indications": (
        "indication", "used", "relief", "relieve", "treat", "for the",
        "pain", "fever", "allerg", "infection", "symptom",
    ),
    "contraindications": (
        "allerg", "not use", "not take", "contraindicat", "kidney",
        "liver", "avoid", "do not",
    ),
    "warnings": (
        "doctor", "warning", "caution", "consult", "risk", "before use",
        "stop use", "pregnan", "kidney", "liver", "advice",
    ),
    "side_effects": (
        "effect", "nausea", "vomit", "rash", "headache", "dizz", "diarr",
        "pain", "drows", "itch", "fever", "somnol", "constipat",
        "abdominal", "insomnia", "tired", "flatulence", "ulcer", "anemia",
    ),
    "dosage": (
        "dose", "dosage", "mg", "ml", "tablet", "capsule", "take", "times",
        "day", "hour", "teaspoon",
    ),
    "storage": (
        "stor", "temperature", "keep", "child", "light", "moisture",
        "expir", "cool", "dry",
    ),
}


def _kind_relevant(candidate: str, kind: str | None) -> bool:
    """True when the answer actually addresses the requested category."""
    terms = _KIND_TERMS.get(kind or "")
    if not terms:
        return True
    lowered = candidate.lower()
    return any(term in lowered for term in terms)


def _llm_candidate(text: str, evidence: list[str]) -> str:
    """Generator output or empty string (never raises)."""
    try:
        raw, truncated = generation.generate(text, evidence)
        return _tidy(raw.strip(), truncated)
    except Exception:
        return ""


def _candidate_ok(
    candidate: str, record: dict, kind: str | None, evidence_text: str
) -> bool:
    """All quality gates for one generator answer about a verified record."""
    return bool(candidate) and all(
        (
            _substantive_answer(candidate),
            not generation.indicates_insufficiency(candidate),
            _kind_relevant(candidate, kind),
            not _mostly_indications(candidate, record, kind),
            _quantities_traceable(candidate, record),
            _mentions_only_own_regs(candidate, record),
            _numbers_grounded(candidate, evidence_text),
            _grounded(candidate, evidence_text),
        )
    )


def _composed_answer(records: list[dict], usage: bool = False) -> str:
    """Deterministic fallback built ONLY from verified record fields.

    Used for enumeration answers and when the generator is unavailable;
    never invents anything. Fields the source does not record are
    reported explicitly as "not recorded in the structured record"; with
    ``usage`` every record also reports its documented indications (or
    their absence).
    """
    if len(records) == 1:
        r = records[0]
        bits = []
        if r.get("genericName"):
            bits.append(f"{r['brand']} is recorded with generic name {r['genericName']}")
        if r.get("strength") and r.get("dosageForm"):
            bits.append(f"strength {r['strength']}, dosage form {r['dosageForm']}")
        if r.get("registrationNumber"):
            bits.append(f"FDA Reg. No. {r['registrationNumber']}")
        if r.get("manufacturer"):
            bits.append(f"manufacturer {r['manufacturer']}")
        if r.get("pharmacologicCategory"):
            bits.append(f"pharmacologic category {r['pharmacologicCategory']}")
        if _indications_text(r):
            bits.append(f"documented indications: {_indications_text(r)}")
        missing = [
            label
            for label, value in (
                ("dosage form", r.get("dosageForm")),
                ("strength", r.get("strength")),
                ("FDA registration number", r.get("registrationNumber")),
                ("manufacturer", r.get("manufacturer")),
                ("indications", _indications_text(r)),
            )
            if not value
        ]
        tail = f" {_MISSING.capitalize()}: {', '.join(missing)}." if missing else ""
        body = "; ".join(bits).rstrip(" .")
        return (
            f"{body}.{tail} See the structured card and source "
            "citation below."
        )
    lines = [
        f"I found {len(records)} matching records in the source documents. "
        "Each formulation is listed separately below so their details are not mixed.",
        "",
    ]
    for r in records:
        strength_form = " ".join(
            part for part in (r.get("strength"), r.get("dosageForm")) if part
        )
        line = (
            f"{r['brand']}: generic {r.get('genericName') or _MISSING}, "
            f"{strength_form or _MISSING}, "
            f"FDA Reg. No. {r.get('registrationNumber') or _MISSING}"
        )
        if usage:
            line += f" — uses: {_indications_text(r) or _MISSING}"
        lines.append(line)
    return "\n".join(lines)


def _usage_answer(record: dict) -> str:
    """Deterministic indications answer from the verified record."""
    registration = record.get("registrationNumber")
    reg_bit = f" (FDA Reg. No. {registration})" if registration else ""
    return (
        f"{record['brand']} — documented indications: {record['indications']}"
        f"{reg_bit}. See the structured card and source citation below."
    )


def _not_documented_answer(record: dict, leaflet_present: bool = False) -> str:
    """Explicit insufficiency response for one verified record.

    Distinguishes "absent from the structured record but searched" from
    "no official leaflet is published for this registration", so the app
    never claims a leaflet was checked when it does not exist.
    """
    registration = record.get("registrationNumber")
    reg_bit = f" (FDA Reg. No. {registration})" if registration else ""
    if leaflet_present:
        return (
            "I checked both the structured registration record and the "
            "official leaflet pages in the MediFind volumes: they do not "
            f"document that information for {record['brand']}{reg_bit}. "
            "The card below lists the structured fields that are recorded."
        )
    return (
        "The structured registration record does not include that "
        f"information for {record['brand']}{reg_bit}, and no official "
        "leaflet is published for this registration in the MediFind "
        "volumes. The card below lists the structured fields that are "
        "recorded."
    )


def _unique(values) -> list[str]:
    """Ordered unique non-empty strings."""
    out: list[str] = []
    for value in values:
        text = str(value or "").strip()
        if text and text not in out:
            out.append(text)
    return out


def _brand_root(record: dict) -> str:
    """Normalized product-line name (strength/form detail removed).

    Some source brand names embed a strength ("Biogesic 325"); trailing
    tokens that also appear in the record's strength/form fields are
    trimmed so all formulations of one line group together.
    """
    tokens = normalize_text(
        record.get("brandName") or record.get("brand") or ""
    ).split()
    field_words = set(
        normalize_text(
            f"{record.get('strength') or ''} {record.get('dosageForm') or ''}"
        ).split()
    )
    while len(tokens) > 1 and tokens[-1] in field_words:
        tokens.pop()
    return " ".join(tokens)


def _display_root(record: dict) -> str:
    """Human-readable product-line label matching ``_brand_root``."""
    source = str(record.get("brandName") or record.get("brand") or "")
    root = _brand_root(record).split()
    return " ".join(source.split()[: len(root)]) or source


def _group_records(records: list[dict]) -> list[tuple[str, list[dict]]]:
    """Group records by product line, preserving first-seen order."""
    grouped: dict[str, list[dict]] = {}
    labels: dict[str, str] = {}
    for record in records:
        key = _brand_root(record) or normalize_text(record.get("brand") or "")
        grouped.setdefault(key, []).append(record)
        labels.setdefault(key, _display_root(record))
    return [(labels[key], grouped[key]) for key in grouped]


_COMPARISON_ATTRS = (
    ("active ingredient(s)/generic name", "genericName"),
    ("dosage form", "dosageForm"),
    ("labeled strength", "strength"),
    ("manufacturer", "manufacturer"),
    ("pharmacologic category", "pharmacologicCategory"),
    ("documented indications", "indications"),
)


def _comparison_answer(records: list[dict]) -> str:
    """Deterministic side-by-side comparison from verified record fields.

    A single product line compares its matched formulations record by
    record; products from different lines are compared line by line with
    every documented formulation listed. Strengths keep their verbatim
    units and basis, and the answer states explicitly when magnitudes sit
    on different bases so they are not read as interchangeable.
    """
    groups = _group_records(records)
    lines: list[str] = []
    if len(groups) == 1:
        label, members = groups[0]
        sides = [(m.get("brand") or label, [m]) for m in members]
        lines.append(
            f"Side-by-side comparison of the {len(members)} matched "
            f"formulations of {label}:"
        )
        for record in members:
            lines.append(
                f"- {record.get('brand') or label} — "
                f"labeled strength {record.get('strength') or _MISSING}; "
                f"dosage form {record.get('dosageForm') or _MISSING}; "
                f"FDA Reg. No. {record.get('registrationNumber') or _MISSING}"
            )
    else:
        sides = groups
        lines.append(
            f"Comparison of {len(groups)} products documented in the "
            "source documents:"
        )
        for label, members in groups:
            lines.append("")
            lines.append(
                f"{label} — active ingredient(s)/generic name: "
                f"{', '.join(_unique(r.get('genericName') for r in members)) or _MISSING}; "
                "pharmacologic category: "
                f"{', '.join(_unique(r.get('pharmacologicCategory') for r in members)) or _MISSING}"
            )
            for record in members:
                lines.append(
                    f"- {record.get('brand') or label} — "
                    f"labeled strength {record.get('strength') or _MISSING}; "
                    f"dosage form {record.get('dosageForm') or _MISSING}; "
                    f"FDA Reg. No. {record.get('registrationNumber') or _MISSING}"
                )
            indications = _unique(_indications_text(r) for r in members)
            lines.append(
                f"  documented indications: "
                f"{'; '.join(indications) if indications else _MISSING}"
            )

    shared: list[str] = []
    differences: list[str] = []
    for name, key in _COMPARISON_ATTRS:
        values = [
            (
                side_label,
                "; ".join(_unique(_side_field(r, key) for r in side_records)),
            )
            for side_label, side_records in sides
        ]
        present = [value for _label, value in values if value]
        if not present:
            differences.append(
                f"- {name}: {_MISSING} for the compared products."
            )
        elif len(present) == len(values) and len(set(present)) == 1:
            shared.append(f"{name} ({present[0].rstrip(' .')})")
        else:
            detail = "; ".join(
                f"{side_label} → {value or _MISSING}"
                for side_label, value in values
            )
            differences.append(f"- {name}: {detail.rstrip(' .')}.")

    lines.append("")
    lines.append("Similarities and differences:")
    if shared:
        lines.append("- Shared: " + "; ".join(shared) + ".")
    lines.extend(differences)
    forms = _unique(r.get("dosageForm") for r in records)
    if len(records) > 1 and (
        len(forms) > 1
        or any(" per " in str(r.get("strength") or "").lower() for r in records)
    ):
        lines.append(
            "- Labeled strengths are stated on each product's own basis (as "
            "printed above with its dosage form); values on different bases "
            "are not directly interchangeable."
        )
    lines.append("See the structured cards and source citations below.")
    return "\n".join(lines)


def _cite_display(cites: list[dict]) -> str:
    """Compact "file page N[, N]" listing, grouped by source file."""
    by_file: dict[str, list[int]] = {}
    for cite in cites:
        by_file.setdefault(cite["source"], []).append(cite["page"])
    parts = []
    for source, pages in by_file.items():
        word = "page" if len(pages) == 1 else "pages"
        parts.append(f"{source} {word} {', '.join(str(p) for p in pages)}")
    return "; ".join(parts)


def _source_answer(records: list[dict]) -> str:
    """Deterministic citation summary for "show me the source" questions."""
    lines = ["Source evidence for the matched product records:"]
    for record in records:
        registration = record.get("registrationNumber")
        own = [
            cite
            for cite in [record.get("citation")]
            + list(record.get("extra_citations") or [])
            if cite
        ]
        leaflet = leaflet_citations(registration) if registration else []
        lines.append(
            f"- {record.get('brand') or registration}: registration record "
            f"{_cite_display(own) or _MISSING}; leaflet: "
            f"{_cite_display(leaflet) or 'no official leaflet is published in the volume'}."
        )
    lines.append("The verbatim passages are listed with the citations below.")
    return "\n".join(lines)


def _quantities_traceable(answer: str, record: dict) -> bool:
    """True when every mg/ml quantity in ``answer`` exists on ``record``.

    Guards against the generator reciting strengths from a sibling
    formulation that slipped into the retrieved evidence.
    """
    return quantity_pairs(answer) <= quantity_pairs(_record_block(record))


def _identifies_record(answer: str, record: dict) -> bool:
    """True when the answer names the verified record it came from.

    Without this the model can answer a full question with a single
    extracted field ("500 mg/213 mg/325 mg per 10 mL") that carries no
    product identity for the user to verify.
    """
    registration = record.get("registrationNumber")
    return bool(registration) and registration in answer


def _mentions_only_own_regs(answer: str, record: dict) -> bool:
    """True when no foreign FDA reg. no. appears in the answer.

    Prevents citing a sibling formulation's registration number that
    slipped into the evidence via a sibling leaflet page.
    """
    own = {str(record.get("registrationNumber") or "").upper()} - {""}
    return regs_in(answer) <= own


def _numbers_grounded(answer: str, evidence_text: str) -> bool:
    """True when every 3+ digit number in the answer exists in the evidence.

    Catches fabricated dosages, years, or registration digits that the
    grounding ratio check can miss in a short answer.
    """
    for number in re.findall(r"\d{3,}", str(answer or "")):
        if number not in evidence_text:
            return False
    return True


def _clarification(matches: list[dict]) -> dict:
    """Ask which formulation the user means instead of guessing.

    Returned as ``insufficient_evidence`` so the frontend shows the
    uncertainty badge; candidate cards and their source pages are still
    attached so the user can pick one.
    """
    records = [m["record"] for m in matches]
    lines = [
        "I found more than one formulation in the source documents. "
        "Which one do you mean?",
        "",
    ]
    for r in records:
        detail = " · ".join(
            p
            for p in (
                r.get("strength"),
                r.get("dosageForm"),
                f"FDA Reg. No. {r['registrationNumber']}"
                if r.get("registrationNumber")
                else None,
                f"page {r['citation']['page']}" if r.get("citation") else None,
            )
            if p
        )
        lines.append(f"- {r['brand']} ({detail})")
    example = next(
        (r.get("dosageForm") for r in records if r.get("dosageForm")),
        "the dosage form",
    )
    lines += [
        "",
        f'Ask about one of them by naming its dosage form, for example '
        f'"{example}".',
    ]
    return _response(
        "\n".join(lines),
        "insufficient_evidence",
        sources=_assemble_sources(matches, []),
        medicine=[card_view(r) for r in records],
        recognized=recognized_label(matches),
    )


def answer_question(message: str) -> dict:
    """Full pipeline for one chat message -> frontend response contract."""
    text = str(message or "").strip()
    if not text:
        return _response(EMPTY_ANSWER, "insufficient_evidence")

    # 1) Excluded topics (diagnosis / prescriptions / dosing / prices)
    if _is_unsupported(text):
        return _response(UNSUPPORTED_ANSWER, "unsupported")

    # 2) Conversation niceties (no retrieval, no model)
    if GREETING.match(text) and len(text) < 40:
        return _response(GREETING_ANSWER, "ok")
    if ABOUT.search(text):
        return _response(ABOUT_ANSWER, "ok")

    # 3) Entity normalization: hand-verified records + every indexed full
    #    product entry, merged and deduplicated by FDA registration number.
    matches = merge_formulation_matches(
        find_medicine_matches(text), find_index_matches(text)
    )

    # 4) Intent: comparisons keep EVERY matched product/formulation (each
    #    side is named in the question) and are never narrowed to one or
    #    sent to clarification.
    comparison_intent = bool(_COMPARISON_QUESTION.search(text))
    source_intent = bool(_SOURCE_QUESTION.search(text)) and not comparison_intent
    if comparison_intent and len(matches) > 1:
        matches = select_mentioned_quantities(text, matches)
    elif not is_enumeration_query(text) and len(matches) > 1:
        # Narrow to the variant the query describes; if the query carries
        # variant detail but still leaves several formulations, ask which
        # one is meant instead of guessing or blending their fields.
        narrowed, variant_signal = narrow_variants(text, matches)
        if len(narrowed) > 1 and variant_signal:
            return _clarification(narrowed)
        matches = narrowed

    records = [m["record"] for m in matches]
    hits = retrieve(text, k=TOP_K)
    if records:
        # Keep sibling-formulation and unrelated chunks out of evidence.
        hits = filter_conflicting_hits(hits, records)

    usage_intent = bool(_USAGE_QUESTION.search(text))

    # 5) Evidence = verified records first, then their leaflet passages,
    #    then the entity-filtered retrieved chunks.
    evidence = [_record_block(r) for r in records]
    if len(records) <= 1:
        evidence += _leaflet_blocks(records, text)
    evidence += [_retrieval_block(i, h) for i, h in enumerate(hits, start=1)]
    evidence_text = "\n".join(evidence)

    status = "ok"
    if comparison_intent and len(records) >= 2:
        # 6) Comparisons: deterministic side-by-side answer from verified
        #    fields - both/all products stay represented and strengths are
        #    never blended across formulations.
        answer = _comparison_answer(records)
    elif source_intent and records:
        # 6a) Explicit source/evidence questions: cite from verified
        #     citation metadata instead of asking the model to guess pages.
        answer = _source_answer(records)
    elif len(records) >= 2:
        # 6b) Multi-formulation matches: deterministic enumeration so two
        #     products are never blended ("usage" adds indications per line).
        answer = _composed_answer(records, usage=usage_intent)
    elif len(records) == 1 and _FIELD_QUESTION.search(text):
        # 6c) Field questions: answer straight from the verified record.
        answer = _composed_answer(records)
    elif len(records) == 1 and usage_intent:
        # 6d) Use/indication/directions questions for one verified record.
        #     Structured fields and section-aware leaflet extraction answer
        #     first; the generator is only a fallback, and heading-like
        #     fragments ("Dosage") are rejected as non-answers.
        record = records[0]
        kind = _section_intent(text)
        section = (
            leaflet_section(record.get("registrationNumber"), kind)
            if kind
            else None
        )
        if kind == "indications" and record.get("indications"):
            answer = _usage_answer(record)
        elif section and _section_quality(section["text"]):
            answer = _section_answer(record, kind, section)
        else:
            candidate = _llm_candidate(text, evidence)
            if _candidate_ok(candidate, record, kind, evidence_text):
                answer = candidate
            elif section:
                # Retry with leaflet-only evidence (no structured-field
                # bias); if it still fails, state the OCR limitation.
                focused = _leaflet_blocks(records, text)
                retry = _llm_candidate(text, focused)
                if _candidate_ok(retry, record, kind, "\n".join(focused)):
                    answer = retry
                else:
                    answer = _section_limitation_answer(record, kind, section)
            else:
                # No extracted section: still search the leaflet pages
                # before claiming the information is unavailable.
                leaflet_present = bool(
                    leaflet_citations(record.get("registrationNumber"))
                )
                found = ""
                if leaflet_present:
                    focused = _leaflet_blocks(records, text)
                    retry = _llm_candidate(text, focused)
                    if _candidate_ok(retry, record, kind, "\n".join(focused)):
                        found = retry
                if found:
                    answer = found
                else:
                    answer = _not_documented_answer(
                        record, leaflet_present=leaflet_present
                    )
                    status = "insufficient_evidence"
            if answer and not _identifies_record(answer, record):
                suffix = (
                    f" (FDA Reg. No. {record['registrationNumber']})"
                    if record.get("registrationNumber")
                    else ""
                )
                answer += suffix
    else:
        # 7) General questions: flan-t5 with deterministic record fallbacks.
        try:
            raw, truncated = generation.generate(text, evidence)
            answer = _tidy(raw.strip(), truncated)
        except Exception:
            if records:
                answer = _composed_answer(records)  # verified-only fallback
            else:
                raise  # infrastructure failure -> 500 -> frontend retry

        if not answer:
            answer = _composed_answer(records) if records else INSUFFICIENT_ANSWER
        elif not _substantive_answer(answer):
            # Heading-like fragments are not answers ("Dosage").
            if records:
                answer = _composed_answer(records)
            else:
                return _response(INSUFFICIENT_ANSWER, "insufficient_evidence")

        # Insufficiency: prefer the model's own refusal; a hallucination
        # with no verified record behind it is reported as missing evidence.
        if generation.indicates_insufficiency(answer):
            if records:
                answer = _composed_answer(records)
            else:
                return _response(answer, "insufficient_evidence")

        # Quantity guard: the verified record is authoritative - the model
        # must not state mg/ml values the record does not carry.
        elif records and not _quantities_traceable(answer, records[0]):
            answer = _composed_answer(records)

        # Identity guard: an answer that never names the verified record
        # it came from is not traceable enough.
        elif records and not _identifies_record(answer, records[0]):
            answer = _composed_answer(records)

        # Foreign-register guard: never cite a sibling formulation's reg.
        elif records and not _mentions_only_own_regs(answer, records[0]):
            answer = _composed_answer(records)

        # Number guard: every 3+ digit number must exist in the evidence.
        elif not _numbers_grounded(answer, evidence_text):
            if records:
                answer = _composed_answer(records)
            else:
                return _response(INSUFFICIENT_ANSWER, "insufficient_evidence")

        # Grounding check: content words must exist in the evidence.
        elif not _grounded(answer, evidence_text):
            if records:
                answer = _composed_answer(records)
            else:
                return _response(INSUFFICIENT_ANSWER, "insufficient_evidence")

    # 8) Assemble the response
    sources = _assemble_sources(matches, hits)
    medicine = [card_view(r) for r in records] if records else None
    recognized = recognized_label(matches)
    return _response(answer, status, sources=sources, medicine=medicine,
                     recognized=recognized)
