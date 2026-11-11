"""Formulation enumeration for broad brand queries - Phase 5 T03.

Configuration D top-k=3 retrieval answers focused questions, but a broad
"What formulations of <brand> ...?" query must enumerate every full product
record for that brand that exists in the indexed PDF dataset - not just the
records that happen to sit in the top-3 retrieved chunks (and not just the
ten hand-verified records in ``records.MEDICINE_RECORDS``, which cover only
two of the four Biogesic formulations).

Full product entry vs. table mention
------------------------------------
A chunk is a FULL product entry only when it carries an "Official FDA
Philippines registration record" block whose labeled fields (Brand name,
Generic name, Dosage strength and form, Registration number, Manufacturer)
are present and whose header "FDA Reg. No." agrees with the labeled
registration number. Formulations that merely appear inside the embedded
"OTC forms registered under ..." tables, the volume TOC, or the AVAILABILITY
lists are mentions - they never become records, so a formulation that only
exists as a table row cannot fabricate a card, and a full entry is never
duplicated from its own table row.

Every field is copied verbatim from the chunk text; records are
deduplicated by FDA registration number; each keeps its own source page
for citation. Nothing here modifies the experiment configuration or the
normal top-k=3 retrieval path.
"""

import re
from functools import lru_cache

from rag.records import (
    MEDICINE_RECORDS,
    contains_term,
    find_matches_in,
    normalize_text,
)
from rag.storage import get_vectorstore

# ---------- Broad formulation-query detection ----------
_FORMULATION_INTENT = re.compile(
    r"\b(?:"
    r"formulations?|dosage\s+forms?|drug\s+forms?|product\s+forms?|"
    r"(?:all|list|which|what)\s+(?:the\s+)?(?:formulations?|forms?)|"
    r"forms?\s+of|enumerate"
    r")\b",
    re.I,
)


def is_formulation_query(text: str) -> bool:
    """True for broad enumeration questions ("What formulations of X ...")."""
    return bool(_FORMULATION_INTENT.search(str(text or "")))


# Listing phrasings that also ask for EVERY matching record. These skip
# variant narrowing (Phase 5 T04) so "Tell me about Biogesic" keeps
# enumerating all formulations instead of asking which one is meant.
_ENUMERATION_EXTRA = re.compile(
    r"\btell me about\b|"
    r"\b(?:which|what)\s+(?:the\s+)?products?\b|"
    r"\blists?\b|\blisting\b|"
    r"\bwhich\b[^.?!]*\bcontain(?:s|ed|ing)?\b",
    re.I,
)


def is_enumeration_query(text: str) -> bool:
    """True for queries that want EVERY matching product record.

    Broad formulation questions plus listing phrasings. Enumeration
    queries keep the deterministic multi-record answer; only focused
    queries are narrowed to a single variant.
    """
    text = str(text or "")
    return is_formulation_query(text) or bool(_ENUMERATION_EXTRA.search(text))


# ---------- Full-entry parsing ----------
_MARKER = "Official FDA Philippines registration record"
_FIELD_LABELS = (
    "Brand name",
    "Generic name",
    "Dosage strength and form",
    "Classification",
    "Pharmacologic category",
    "Registration number",
    "Manufacturer",
)
_REQUIRED_FIELDS = (
    "Brand name",
    "Generic name",
    "Dosage strength and form",
    "Registration number",
    "Manufacturer",
)
_HEADER_REG_RE = re.compile(r"FDA Reg\. No\.\s*([A-Za-z0-9\-]+)")
# Token machine for "Dosage strength and form". Strength tokens are numbers,
# units, "/" separators, "per N unit", percentages/ratios and their
# parenthesised equivalents; the first other word starts the dosage form.
_NUMBER_RE = re.compile(r"\d+(?:\.\d+)?")
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z\-]*")
_STRENGTH_WORDS = frozenset("per w v mcg mg ml g l".split())


def parse_strength_form(value: str) -> tuple[str | None, str]:
    """Split a "Dosage strength and form" field into (strength, form).

    Walks the field left to right consuming strength tokens (numbers with
    optional units, slashes, "per N unit", ``%``/``w/w``/``w/v``, and
    parenthesised annotations such as ``(5.26 %/2.82 % w/w)``) until the
    first word that is not a strength continuation - that word starts the
    dosage form. The strength keeps its verbatim source spelling (spacing
    included).

    The whole field becomes the dosage form (strength None) when no digit
    precedes the form word; when the field contains only strength tokens
    the whole field is the strength and the form is empty. A strength is
    never fabricated.
    """
    text = str(value or "").strip()
    if not text:
        return None, ""

    form_start: int | None = None
    saw_digit = False
    pos = 0
    while pos < len(text):
        char = text[pos]
        if char.isspace() or char in "/%":
            pos += 1
            continue
        if char == "(":
            close = text.find(")", pos)
            if close == -1 or not saw_digit:
                break
            pos = close + 1  # annotation belongs to the preceding quantity
            continue
        number_match = _NUMBER_RE.match(text, pos)
        if number_match:
            saw_digit = True
            pos = number_match.end()
            continue
        word_match = _WORD_RE.match(text, pos)
        if word_match:
            if word_match.group(0).lower() in _STRENGTH_WORDS:
                pos = word_match.end()
                continue
            form_start = pos
            break
        form_start = pos  # unknown symbol: treat the rest as dosage form
        break

    if form_start is None:
        return (text, "") if saw_digit else (None, text)
    if not saw_digit:
        return None, text
    strength = text[:form_start].strip()
    form = text[form_start:].strip()
    if not strength or not form:
        return None, text
    return strength, form


def _display_brand(brand_name: str, form_field: str) -> str:
    """Join brand + strength/form without repeating a shared token.

    "Biogesic 325" + "325 mg Tablet" -> "Biogesic 325 mg Tablet"
    (matches the hand-verified records in ``records.MEDICINE_RECORDS``).
    """
    brand_tokens = brand_name.split()
    form_tokens = form_field.split()
    if (
        len(brand_tokens) > 1
        and len(form_tokens) > 1
        and brand_tokens[-1].lower() == form_tokens[0].lower()
    ):
        return f"{brand_name} {' '.join(form_tokens[1:])}"
    return f"{brand_name} {form_field}".strip()


def _parse_full_record(page_text: str, source: str, page0: int) -> dict | None:
    """Parse one full registration-record entry from a page's chunk text.

    Returns ``None`` for table mentions, TOC/AVAILABILITY rows, leaflet
    transcriptions, and any block whose required fields are missing or
    internally inconsistent (never fabricate a partial record).
    """
    if _MARKER not in page_text:
        return None
    lines = page_text.split("\n")
    marker_i = next(
        (i for i, line in enumerate(lines) if _MARKER in line), None
    )
    if marker_i is None:
        return None

    # Parse the labeled block up to the brand availability table. Most
    # values occupy one line, but a few long product names, strengths, and
    # manufacturers wrap across lines. Reconstructed Chroma pages can also
    # replay the tail of an overlapping chunk. Collect every occurrence and
    # keep the final complete value so those three wrapped records are not
    # dropped from the catalog.
    block_lines: list[str] = []
    for line in lines[marker_i + 1 :]:
        if "OTC forms registered under" in line:
            break
        block_lines.append(line)

    occurrences: dict[str, list[str]] = {label: [] for label in _FIELD_LABELS}
    current_label: str | None = None
    current_value: list[str] = []

    def commit_field() -> None:
        if current_label and current_value:
            value = " ".join(part.strip() for part in current_value if part.strip())
            if value:
                occurrences[current_label].append(value)

    for line in block_lines:
        stripped = line.strip()
        if stripped in _FIELD_LABELS:
            commit_field()
            current_label = stripped
            current_value = []
        elif current_label and stripped:
            current_value.append(stripped)
    commit_field()

    fields = {
        label: values[-1]
        for label, values in occurrences.items()
        if values
    }
    if any(not fields.get(key) for key in _REQUIRED_FIELDS):
        return None  # incomplete block: treat as non-entry, do not invent

    # Cross-check the page header registration number against the field.
    header_match = _HEADER_REG_RE.search("\n".join(lines[:marker_i]))
    registration = fields["Registration number"]
    if header_match and header_match.group(1) != registration:
        return None  # inconsistent: refuse rather than guess

    brand_name = fields["Brand name"]
    form_field = fields["Dosage strength and form"]
    generic = fields["Generic name"]

    strength, dosage_form = parse_strength_form(form_field)
    if not dosage_form:
        dosage_form = form_field

    return {
        "id": "idx-" + re.sub(r"[^a-z0-9]+", "-", registration.lower()).strip("-"),
        "brand": _display_brand(brand_name, form_field),
        "brandName": brand_name,
        "genericName": generic,
        "activeIngredients": [part.strip() for part in generic.split("+") if part.strip()],
        "strength": strength,
        "dosageForm": dosage_form,
        "pharmacologicCategory": fields.get("Pharmacologic category") or None,
        "registrationNumber": registration,
        "manufacturer": fields["Manufacturer"],
        "indications": None,  # registration records carry no indication text
        "aliases": [brand_name.split()[0].lower()],
        "citation": {"source": source, "page": page0 + 1},  # 1-based
    }


@lru_cache(maxsize=1)
def _scan_pages() -> tuple[tuple[tuple, str], ...]:
    """Every indexed page's joined text, in first-seen order (cached).

    Chunks are grouped per (source, page) and re-joined in start-index
    order so text split across a chunk boundary is reassembled. Do not
    mutate the returned tuple.
    """
    vectorstore = get_vectorstore()
    got = vectorstore.get(include=["documents", "metadatas"])

    pages: dict[tuple, list[tuple[int, str]]] = {}
    page_order: list[tuple] = []
    for content, meta in zip(got["documents"], got["metadatas"]):
        source = meta.get("source", "unknown")
        page0 = meta.get("page")
        if not isinstance(page0, int):
            continue
        key = (source, page0)
        if key not in pages:
            pages[key] = []
            page_order.append(key)
        pages[key].append((meta.get("start_index") or 0, content))

    return tuple(
        (
            key,
            "".join(
                text for _, text in sorted(pages[key], key=lambda item: item[0])
            ),
        )
        for key in page_order
    )


@lru_cache(maxsize=1)
def load_index_records() -> tuple[dict, ...]:
    """Scan the Chroma index once and return every full product entry.

    Pages are parsed from ``_scan_pages`` and deduplicated by FDA
    registration number (first page wins). Do not mutate the returned
    records.
    """
    records: list[dict] = []
    seen_regs: set[str] = set()
    for (source, page0), page_text in _scan_pages():
        record = _parse_full_record(page_text, source, page0)
        if record is None:
            continue
        registration = record["registrationNumber"]
        if registration in seen_regs:
            continue
        seen_regs.add(registration)
        records.append(record)
    return tuple(records)


_LEAFLET_HEADER_RE = re.compile(
    r"official leaflet text\s*\(\s*ocr", re.I
)
_LEAFLET_REG_RE = re.compile(
    r"official FDA leaflet for Reg\. No\.\s*([A-Za-z0-9\-]+)", re.I
)
_RECORD_MARKER_RE = re.compile(
    r"Official FDA Philippines registration record", re.I
)


@lru_cache(maxsize=1)
def load_leaflet_pages() -> dict[str, tuple[tuple[str, int], ...]]:
    """Map FDA reg. no. -> leaflet-text pages naming it.

    A leaflet section starts at a page headed "Official leaflet text (OCR
    transcription)" whose sentence "transcription of the official FDA
    leaflet for Reg. No. X" is authoritative (body artwork metadata
    sometimes cites a different reg). Following pages continue the same
    leaflet until the next leaflet section or the next registration-record
    entry. Only regs of known records are mapped.

    Do not mutate the returned dict or its tuples.
    """
    known = {
        str(r.get("registrationNumber") or "").upper()
        for r in tuple(load_index_records()) + tuple(MEDICINE_RECORDS)
        if r.get("registrationNumber")
    }
    leaflets: dict[str, list[tuple[str, int]]] = {}
    if not known:
        return {}
    current: str | None = None
    for (source, page0), page_text in _scan_pages():
        page = page0 + 1  # 1-based for citations
        if _LEAFLET_HEADER_RE.search(page_text):
            current = None
            reg_match = _LEAFLET_REG_RE.search(page_text)
            if reg_match:
                reg = reg_match.group(1).upper()
                if reg in known:
                    current = reg
                    leaflets.setdefault(reg, []).append((source, page))
            continue
        if _RECORD_MARKER_RE.search(page_text):
            current = None  # a record entry ends any leaflet section
            continue
        if current:
            leaflets[current].append((source, page))
    return {reg: tuple(pages) for reg, pages in leaflets.items()}


def leaflet_citations(registration: str) -> list[dict]:
    """Leaflet source pages that document ``registration`` (possibly none)."""
    pages = load_leaflet_pages().get(str(registration or "").upper())
    if not pages:
        return []
    return [{"source": source, "page": page} for source, page in pages]


def leaflet_owner(source: str, page_1based: int) -> str | None:
    """Registration whose official leaflet occupies that page, if any."""
    for registration, pages in load_leaflet_pages().items():
        if (source, page_1based) in pages:
            return registration
    return None


# Leaflet section headings as printed in the OCR transcriptions. Kinds are
# the reusable information categories the chat can answer from a leaflet.
_SECTION_HEADINGS = (
    (
        "indications",
        r"(?:what (?:is|are) (?:this|the) medicine used for|"
        r"what is it used for|what is this medicine for|"
        r"what the medicine is used for|(?<!contra)indications?)",
    ),
    (
        "contraindications",
        r"(?:when should you not take this medicine|"
        r"when should you not use this medicine|contraindications?)",
    ),
    (
        "warnings",
        r"(?:care that should be taken when taking this medicine|"
        r"warnings? and precautions?|warnings?|precautions?)",
    ),
    (
        "side_effects",
        r"(?:undesirable effects?|side effects?|"
        r"adverse (?:drug )?(?:effects?|reactions?))",
    ),
    (
        "dosage",
        r"(?:how much and how often should you use this medicine|"
        r"dosage and administration|dosage|directions for use|"
        r"how (?:to|should you) (?:use|take) (?:this medicine|it))",
    ),
    (
        "storage",
        r"(?:how should you keep this medicine|how to store this medicine|"
        r"storage)",
    ),
)
# Additional headings that END a section even though they have no kind.
_EXTRA_HEADINGS = (
    r"formulations?",
    r"product descriptions?",
    r"what is in the medicine",
    r"strength of the medicine",
    r"signs and symptoms of overdose",
    r"what to do when you have taken more than the recommended dosage",
    r"adverse drug reaction reporting statement",
    r"availability",
    r"date of first authorization[^\n]*",
    r"date of revision[^\n]*",
    r"other information",
    r"before you use",
    r"manufactured by[^\n]*",
    r"when should you consult your doctor",
)
_HEADING_RE = re.compile(
    r"(?m)^[ \t]*(?:"
    + "|".join(pattern for _kind, pattern in _SECTION_HEADINGS)
    + "|"
    + "|".join(_EXTRA_HEADINGS)
    + r")\s*\??",
    re.I,
)
_SECTION_MIN_CHARS = 25


def _heading_spans(text: str) -> list[tuple[int, int]]:
    """Start/end offsets of every printed leaflet heading in ``text``."""
    spans = [(m.start(), m.end()) for m in _HEADING_RE.finditer(text)]
    if not spans:
        # Some transcriptions put headings mid-line; retry without the
        # line-start anchor rather than missing the section entirely.
        fallback = re.compile(_HEADING_RE.pattern.replace("^[ \\t]*", ""), re.I)
        spans = [(m.start(), m.end()) for m in fallback.finditer(text)]
    return spans


def _dedupe_replay(text: str, size: int = 8) -> str:
    """Drop chunk-overlap replays that repeat earlier words.

    Page text is rebuilt from overlapping chunks, so the same phrase can
    appear twice in a row. When an ``size``-word run repeats earlier text
    the duplicate run is removed; any unique continuation after it stays.
    """
    words = text.split()
    if len(words) < 2 * size:
        return text
    seen: dict[tuple, int] = {}
    out: list[str] = []
    i = 0
    while i < len(words):
        key = tuple(words[i : i + size])
        prev = seen.get(key) if len(key) == size else None
        if prev is not None:
            run = size
            while (
                i + run < len(words)
                and prev + run < i
                and words[prev + run] == words[i + run]
            ):
                run += 1
            if run >= size:
                i += run
                continue
        if len(key) == size:
            seen.setdefault(key, i)
        out.append(words[i])
        i += 1
    return " ".join(out)


def _clean_section_text(text: str) -> str:
    """Whitespace/control-character cleanup for OCR section bodies."""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)
    text = re.sub(r"(?<=[a-z])\.(?=[A-Za-z])", ". ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = _dedupe_replay(text.strip())
    return text.strip(" \n\t:.-–—•*")


def _extract_sections(
    full_text: str, bounds: list[tuple[int, str, int]]
) -> dict[str, dict]:
    """Split one leaflet's reconstructed text into information sections.

    ``bounds`` maps offset -> (source, page) so each section can be cited
    to the page(s) it actually came from. Overlapping chunk joins replay
    earlier text, so the LONGEST candidate for a heading is kept - the
    genuine section body always outlasts its replayed fragment.
    """
    spans = _heading_spans(full_text)
    if not spans:
        return {}
    sections: dict[str, dict] = {}
    for kind, pattern in _SECTION_HEADINGS:
        kind_re = re.compile(r"(?m)^[ \t]*" + pattern + r"\s*\??", re.I)
        matches = list(kind_re.finditer(full_text))
        if not matches:
            kind_re = re.compile(pattern + r"\s*\??", re.I)
            matches = list(kind_re.finditer(full_text))
        best: tuple[int, int] | None = None
        for match in matches:
            end = len(full_text)
            for start, _ in spans:
                if start >= match.end():
                    end = start
                    break
            body = _clean_section_text(full_text[match.end():end])
            if len(body) >= _SECTION_MIN_CHARS and (
                best is None or len(body) > best[1] - best[0]
            ):
                best = (match.end(), end)
        if best is None:
            continue
        body = _clean_section_text(full_text[best[0]:best[1]])
        start_page = _page_at(bounds, best[0])
        end_page = _page_at(bounds, max(best[1] - 1, best[0]))
        pages = [start_page, end_page] if end_page != start_page else [start_page]
        sections[kind] = {
            "kind": kind,
            "text": body,
            "source": start_page[0],
            "pages": [page for _source, page in pages],
        }
    return sections


def _page_at(bounds: list[tuple[int, str, int]], offset: int) -> tuple[str, int]:
    current = bounds[0]
    for start, source, page in bounds:
        if start > offset:
            break
        current = (start, source, page)
    return current[1], current[2]


@lru_cache(maxsize=1)
def load_leaflet_sections() -> dict[str, dict[str, dict]]:
    """Registration -> section kind -> {"text", "source", "pages"}."""
    page_texts = {
        (source, page0 + 1): text for (source, page0), text in _scan_pages()
    }
    sections: dict[str, dict] = {}
    for registration, cites in load_leaflet_pages().items():
        parts: list[str] = []
        bounds: list[tuple[int, str, int]] = []
        offset = 0
        for source, page in cites:
            bounds.append((offset, source, page))
            parts.append(page_texts.get((source, page), ""))
            offset += len(parts[-1]) + 1
        found = _extract_sections("\n".join(parts), bounds)
        if found:
            sections[registration] = found
    return sections


def leaflet_section(registration: str, kind: str) -> dict | None:
    """One extracted leaflet section (or None) for a registration."""
    return load_leaflet_sections().get(str(registration or "").upper(), {}).get(kind)


def leaflet_sections(registration: str) -> dict[str, dict]:
    """Every extracted leaflet section for a registration (possibly none)."""
    return load_leaflet_sections().get(str(registration or "").upper(), {})


def find_index_matches(text: str) -> list[dict]:
    """``[{"record", "matchedTerm"}]`` over index-derived full entries.

    Uses the same term matching and ambiguity suppression as
    ``records.find_medicine_matches`` so brand-level rules stay consistent.
    """
    query = normalize_text(text)
    if not query:
        return []
    return find_matches_in(query, list(load_index_records()))


def merge_formulation_matches(
    hardcoded: list[dict], indexed: list[dict]
) -> list[dict]:
    """Merge match lists, deduplicating by registration number (or id).

    Hand-verified records win on collision so their stable ids, aliases,
    and frontend-twin fields are preserved; index-only entries are appended
    in page order.
    """
    seen_regs: set[str] = set()
    seen_ids: set[str] = set()
    merged: list[dict] = []
    for match in list(hardcoded) + list(indexed):
        record = match["record"]
        registration = record.get("registrationNumber")
        record_id = record.get("id")
        if (registration and registration in seen_regs) or (
            record_id and record_id in seen_ids
        ):
            continue
        merged.append(match)
        if registration:
            seen_regs.add(registration)
        if record_id:
            seen_ids.add(record_id)
    return merged


# ---------- Variant narrowing (Phase 5 T04) ----------
# Dosage-form phrases, longest first so "oral suspension" wins over
# "suspension" and "chewable tablet" over "tablet".
_FORM_PHRASES = (
    "powder for oral suspension",
    "film-coated tablet",
    "effervescent tablet",
    "chewable tablet",
    "oral suspension",
    "suspension",
    "syrup",
    "tablet",
    "capsule",
    "powder",
    "sachet",
    "drops",
)

_QTY_RE = re.compile(r"\b(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g)\b", re.I)
# FDA reg. no. shapes: DR-153, DR-XY43337, DRP-8763, DRP-1872-02, DRHR-1167
_REG_RE = re.compile(r"\b(?:DR|DRP|DRHR)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b", re.I)


def quantity_pairs(text: str) -> set[tuple[str, str]]:
    """Lowercased ``(number, unit)`` pairs for mg/ml/mcg/g quantities."""
    return {(n, u.lower()) for n, u in _QTY_RE.findall(str(text or ""))}


def _search_text(record: dict) -> str:
    """Normalized brand/strength/form text used by the narrowing stages."""
    return normalize_text(
        " ".join(
            str(record.get(k) or "")
            for k in ("brand", "brandName", "strength", "dosageForm")
        )
    )


def _quantity_text(record: dict) -> str:
    """Raw strength-bearing fields used for quantity comparison.

    ``normalize_text`` deliberately removes punctuation for entity matching,
    but that turns a decimal such as ``12.5 mg`` into ``12 5 mg``.  Quantity
    parsing must therefore use the original fields so a decimal formulation
    is never mistaken for its trailing digit.
    """
    return " ".join(
        str(record.get(k) or "")
        for k in ("brand", "brandName", "strength", "dosageForm")
    )


def select_mentioned_quantities(text: str, matches: list[dict]) -> list[dict]:
    """Keep records documenting ANY strength quantity named in the query.

    Comparison questions name one labeled strength per product ("Biogesic
    500 mg vs Biogesic 325 mg"), so the narrower's all-quantities rule
    would drop one side. Applied only when at least two distinct
    quantities are named, and never empties the set.
    """
    quantities = quantity_pairs(text)
    if len(quantities) < 2 or len(matches) < 2:
        return list(matches)
    selected = [
        m
        for m in matches
        if quantity_pairs(_quantity_text(m["record"])) & quantities
    ]
    return selected or list(matches)


def _variant_tokens(record: dict) -> set[str]:
    """Brand-variant tokens (brand root dropped) that identify WHICH
    product variant a record is: "double action", "infant", "500", "ml"...
    """
    tokens: set[str] = set()
    for source in (record.get("brandName"), record.get("brand")):
        if not source:
            continue
        parts = normalize_text(source).split()
        if len(parts) > 1:
            tokens.update(parts[1:])
    return tokens


def narrow_variants(text: str, matches: list[dict]) -> tuple[list[dict], bool]:
    """Best-effort narrowing of multi-record matches to the variant the
    query describes (Phase 5 T04).

    Returns ``(matches, variant_signal)`` where ``variant_signal`` is True
    when the query carried variant detail (a dosage form, a brand
    qualifier, or a strength/quantity). Stages run dosage-form -> brand
    variant -> quantity and never empty the set: a stage that would drop
    every record is skipped. Callers turn a surviving multi-record set
    with ``variant_signal`` into a clarification question instead of
    guessing or blending formulations.
    """
    if len(matches) <= 1:
        return matches, False

    query = normalize_text(text)
    query_tokens = set(query.split())
    current = list(matches)
    dropped = False
    stage_a_max = 0

    # (b) Dosage-form phrase: keep records whose form matches the longest
    # form named in the query ("Gaviscon 10 mL Oral Suspension" must not
    # be answered from a chewable-tablet record).
    forms = [f for f in _FORM_PHRASES if contains_term(query, f)]
    if forms:
        longest = max(forms, key=len)
        candidate = [
            m for m in current
            if contains_term(_search_text(m["record"]), longest)
        ]
        if candidate:
            dropped = dropped or len(candidate) < len(current)
            current = candidate

    # (a) Brand-variant tokens: keep only the records whose brand detail
    # scores best against the query ("Double Action" vs plain "Gaviscon").
    if len(current) > 1:
        scores = [
            len(_variant_tokens(m["record"]) & query_tokens) for m in current
        ]
        stage_a_max = max(scores)
        if stage_a_max > 0:
            candidate = [
                m for m, s in zip(current, scores) if s == stage_a_max
            ]
            dropped = dropped or len(candidate) < len(current)
            current = candidate

    # (c) Explicit quantities in the query must appear on the record.
    quantities = quantity_pairs(text)
    if quantities and len(current) > 1:
        def _has_all(match: dict) -> bool:
            return quantities <= quantity_pairs(_quantity_text(match["record"]))

        candidate = [m for m in current if _has_all(m)]
        if candidate:
            dropped = dropped or len(candidate) < len(current)
            current = candidate

    return current, (dropped or stage_a_max > 0)


def regs_in(text: str) -> set[str]:
    """Uppercased FDA reg. nos. mentioned in ``text``."""
    return {m.group(0).upper() for m in _REG_RE.finditer(str(text or ""))}


def _identity_phrases(record: dict) -> list[str]:
    """Normalized brand identity phrases for recognizing a record in prose.

    Brand / brandName / aliases only - generic names and active
    ingredients are deliberately excluded so a chunk about the substance
    is never mistaken for a chunk about the product.
    """
    phrases: list[str] = []
    for source in (
        [record.get("brandName"), record.get("brand")]
        + list(record.get("aliases") or [])
    ):
        if not source:
            continue
        phrase = normalize_text(source)
        if phrase and phrase not in phrases:
            phrases.append(phrase)
    return phrases


def filter_conflicting_hits(hits: list[dict], records: list[dict]) -> list[dict]:
    """Drop retrieved chunks that are about a DIFFERENT product.

    Once a query is narrowed to specific records, three filters apply:

    - registration filter: a chunk citing an FDA reg. no. outside the
      matched records is a sibling formulation's text (wrong strengths) -
      dropped.
    - leaflet-ownership filter: a page that belongs to another
      registration's official leaflet is that product's leaflet text even
      when it does not print the reg. no. - dropped.
    - entity filter: a chunk with no reg. no. must at least name one of
      the matched products (brand / brandName / alias) - anonymous prose,
      TOC or AVAILABILITY text about other products is dropped.

    Chunks citing only the matched reg. nos. are always kept. With no
    matched records every hit is kept (nothing to filter against).
    """
    if not records:
        return list(hits)
    keep = {
        str(r.get("registrationNumber") or "").upper()
        for r in records
        if r.get("registrationNumber")
    }
    identities: list[str] = []
    for record in records:
        for phrase in _identity_phrases(record):
            if phrase not in identities:
                identities.append(phrase)
    kept: list[dict] = []
    for hit in hits:
        content = str(hit.get("content") or "")
        regs = regs_in(content)
        if regs and not regs <= keep:
            continue
        owner = leaflet_owner(hit.get("source"), hit.get("page"))
        if owner and owner not in keep:
            continue
        if not regs:
            normalized = normalize_text(content)
            if not any(
                contains_term(normalized, phrase) for phrase in identities
            ):
                continue
        kept.append(hit)
    return kept
