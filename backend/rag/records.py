"""Verified OTC medicine records + pharmaceutical entity normalization.

Records are the Python twin of ``frontend/src/api/medicines.js``: every
field was extracted from the MediFind OTC source PDFs (Volume 1, pages
cited per record) or from the verified ground-truth set in
GroupApex_RAG_Experiment_Results.xlsx. Fields the sources do not document
are ``None`` and must render as "Not available in the source" - never
invent values here.

Matching mirrors ``frontend/src/utils/normalize.js``: case-insensitive,
word-boundary containment against brand / generic name / active
ingredients / explicit aliases / FDA registration number, longest term
wins, multiple formulations of one brand stay separate. A typo-tolerant
fallback (bounded edit distance against brand identity words) runs only
when exact matching finds nothing at all.
"""

import re

VOL1 = "MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf"

MEDICINE_RECORDS: list[dict] = [
    {
        "id": "biogesic-325",
        "brand": "Biogesic 325 mg Tablet",
        "genericName": "Paracetamol",
        "activeIngredients": ["Paracetamol"],
        "strength": "325 mg",
        "dosageForm": "Tablet",
        "pharmacologicCategory": "Analgesic / Antipyretic",
        "registrationNumber": "DRP-8763",
        "manufacturer": "PT Medifarma Laboratories",
        "indications": None,
        "aliases": ["biogesic 325", "biogesic 325 mg", "biogesic"],
        "citation": {"source": VOL1, "page": 19},
    },
    {
        "id": "biogesic-500",
        "brand": "Biogesic 500 mg Tablet",
        "genericName": "Paracetamol",
        "activeIngredients": ["Paracetamol"],
        "strength": "500 mg",
        "dosageForm": "Tablet",
        "pharmacologicCategory": "Analgesic/Antipyretic",
        "registrationNumber": "DR-153",
        "manufacturer": "UNILAB, Inc.",
        "indications": None,
        "aliases": ["biogesic 500", "biogesic 500 mg", "biogesic"],
        "citation": {"source": VOL1, "page": 18},
    },
    {
        "id": "dolfenal-250",
        "brand": "Dolfenal 250 mg Film-Coated Tablet",
        "genericName": "Mefenamic Acid",
        "activeIngredients": ["Mefenamic Acid"],
        "strength": "250 mg",
        "dosageForm": "Film-Coated Tablet",
        "pharmacologicCategory": (
            "Anti-Inflammatory and Anti-Rheumatic Products, Non-Steroids (Fenamates)"
        ),
        "registrationNumber": "DRP-8716",
        "manufacturer": "Amherst Laboratories, Inc.",
        "indications": (
            "For the relief of mild to moderate pain including headache, "
            "dental pain, and dysmenorrhea (menstrual discomfort)."
        ),
        "aliases": ["dolfenal"],
        "citation": {"source": VOL1, "page": 22},
        "extra_citations": [{"source": VOL1, "page": 24}],
    },
    {
        "id": "flanax-220",
        "brand": "Flanax 220 mg Film-Coated Tablet",
        "genericName": "Naproxen Sodium",
        "activeIngredients": ["Naproxen Sodium"],
        "strength": "220 mg",
        "dosageForm": "Film-Coated Tablet",
        "pharmacologicCategory": "Non-Steroidal Anti-inflammatory Drug",
        "registrationNumber": "DR-XY46695",
        "manufacturer": "Interphil Laboratories, Inc.",
        "indications": None,
        "aliases": ["flanax 220", "flanax 220 mg", "flanax"],
        "citation": {"source": VOL1, "page": 33},
    },
    {
        "id": "flanax-275",
        "brand": "Flanax 275 mg Film-Coated Tablet",
        "genericName": "Naproxen Sodium",
        "activeIngredients": ["Naproxen Sodium"],
        "strength": "275 mg",
        "dosageForm": "Film-Coated Tablet",
        "pharmacologicCategory": "Non-Steroidal Anti-inflammatory Drug",
        "registrationNumber": "DR-XY46696",
        "manufacturer": "PT. Taisho Pharmaceutical Indonesia Tbk.",
        "indications": None,
        "aliases": ["flanax 275", "flanax 275 mg", "flanax"],
        "citation": {"source": VOL1, "page": 38},
    },
    {
        "id": "alaxan",
        "brand": "Alaxan 200 mg/325 mg Tablet",
        "genericName": "Ibuprofen + Paracetamol",
        "activeIngredients": ["Ibuprofen", "Paracetamol"],
        "strength": "200 mg/325 mg",
        "dosageForm": "Tablet",
        "pharmacologicCategory": (
            "Non-Steroidal Anti-Inflammatory Drug (NSAID)/Analgesic/Antipyretic"
        ),
        "registrationNumber": "DR-XY37938",
        "manufacturer": "PT. Medifarma Laboratories",
        "indications": None,
        "aliases": ["alaxan"],
        "citation": {"source": VOL1, "page": 4},
    },
    {
        "id": "saridon",
        "brand": "Saridon 500 mg/50 mg Tablet",
        "genericName": "Paracetamol + Caffeine",
        "activeIngredients": ["Paracetamol", "Caffeine"],
        "strength": "500 mg/50 mg",
        "dosageForm": "Tablet",
        "pharmacologicCategory": "Analgesic/Antipyretic",
        "registrationNumber": "DR-XY46456",
        "manufacturer": "PT. Bayer Indonesia",
        "indications": (
            "For fast and effective relief of mild to severe headaches; for the "
            "relief of pain such as headache, toothache, menstrual discomfort, "
            "postoperative and rheumatic pain."
        ),
        "aliases": ["saridon"],
        "citation": {"source": VOL1, "page": 63},
        "extra_citations": [{"source": VOL1, "page": 64}],
    },
    {
        "id": "saridon-max",
        "brand": "Saridon Max 275 mg Film-Coated Tablet",
        "genericName": "Naproxen Sodium",
        "activeIngredients": ["Naproxen Sodium"],
        "strength": "275 mg",
        "dosageForm": "Film-Coated Tablet",
        "pharmacologicCategory": "Non-Selective COX Inhibitor",
        "registrationNumber": "DRP-1872-02",
        "manufacturer": "Interphil Laboratories, Inc.",
        "indications": None,
        "aliases": ["saridon max", "saridon max 275", "saridon max 275 mg"],
        "citation": {"source": VOL1, "page": 73},
    },
    {
        "id": "tempra-325",
        "brand": "Tempra 325 mg Tablet",
        "genericName": "Paracetamol",
        "activeIngredients": ["Paracetamol"],
        "strength": "325 mg",
        "dosageForm": "Tablet",
        "pharmacologicCategory": "Analgesic/ Antipyretic",
        "registrationNumber": "DR-4396",
        "manufacturer": "Interphil Laboratories, Inc.",
        "indications": None,
        "aliases": ["tempra 325", "tempra 325 mg", "tempra"],
        "citation": {"source": VOL1, "page": 74},
    },
    {
        "id": "tempra-blizz",
        "brand": "Tempra Blizz 500 mg Effervescent Tablet",
        "genericName": "Paracetamol",
        "activeIngredients": ["Paracetamol"],
        "strength": "500 mg",
        "dosageForm": "Effervescent Tablet (Orange Flavor)",
        "pharmacologicCategory": "Analgesic / Antipyretic",
        "registrationNumber": "DR-XY48911",
        "manufacturer": "DHG Pharmaceutical Joint-Stock Company",
        "indications": None,
        "aliases": ["tempra blizz", "tempra blizz 500", "tempra blizz 500 mg"],
        "citation": {"source": VOL1, "page": 76},
    },
]

# Fields returned to the frontend medicine card (must match MedicineCard.jsx).
CARD_FIELDS = [
    "id",
    "brand",
    "genericName",
    "activeIngredients",
    "strength",
    "dosageForm",
    "pharmacologicCategory",
    "registrationNumber",
    "manufacturer",
    "indications",
]


def normalize_text(text: str) -> str:
    """Lowercase, strip punctuation (keep + and /), normalize spacing.

    Digit/letter boundaries are split ("500mg" -> "500 mg") so a compact
    query and a spaced record field match the same way. Both the query and
    the record terms go through this function, so registration numbers
    stay consistent on both sides ("DR-XY43337" -> "dr xy 43337").
    """
    text = re.sub(r"[^\w\s+/]", " ", str(text or "").lower())
    text = re.sub(r"(\d)([a-z])", r"\1 \2", text)
    text = re.sub(r"([a-z])(\d)", r"\1 \2", text)
    return re.sub(r"\s+", " ", text).strip()


def contains_term(normalized_query: str, term: str) -> bool:
    """Word-boundary containment: 'flan' must not match 'flanax'."""
    if not term:
        return False
    pattern = rf"(^|[^a-z0-9]){re.escape(term)}([^a-z0-9]|$)"
    return re.search(pattern, normalized_query) is not None


# ---------- Fuzzy fallback (typo tolerance) ----------
# Dosage-form vocabulary: never treated as a product-identity word.
_FORM_WORDS = frozenset(
    """
    tablet tablets capsule capsules syrup suspension solution powder sachet
    sachets granule granules drop drops spray aerosol patch patches cream gel
    ointment lozenge lozenges effervescent chewable coated film film-coated
    oral oromucosal ophthalmic transdermal dry inhaler inhalation suppository
    suppositories
    """.split()
)

# Query words too generic to prove (or disprove) a product identity.
_FUZZY_STOP = frozenset(
    """
    what which when where about there these those does did tell give generic
    generics brand brands medicine medicines product products contain contains
    contained listing listed dosage form forms used usage from with have been
    will would could should their them they your you this that info
    information strength strengths active ingredient ingredients name names
    document documents documented source sources registration pharmacologic
    category classification composition directions
    """.split()
)


def _edit_distance_within(a: str, b: str, limit: int) -> bool:
    """True when the Levenshtein distance of ``a`` and ``b`` is <= limit."""
    if abs(len(a) - len(b)) > limit:
        return False
    if a == b:
        return True
    previous = list(range(len(b) + 1))
    for i, char_a in enumerate(a, start=1):
        current = [i]
        row_best = i
        for j, char_b in enumerate(b, start=1):
            cost = 0 if char_a == char_b else 1
            value = min(
                previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost
            )
            current.append(value)
            if value < row_best:
                row_best = value
        if row_best > limit:
            return False
        previous = current
    return previous[-1] <= limit


def _identity_words(record: dict) -> set[str]:
    """Brand identity words of one record (no form words, no short words)."""
    words: set[str] = set()
    for source in (
        [record.get("brandName"), record.get("brand"), record.get("genericName")]
        + list(record.get("activeIngredients") or [])
        + list(record.get("aliases") or [])
    ):
        if not source:
            continue
        for word in normalize_text(source).split():
            if (
                len(word) >= 5
                and word.isalpha()
                and word not in _FORM_WORDS
                and word not in _FUZZY_STOP
            ):
                words.add(word)
    return words


def _fuzzy_matches(query: str, records: list[dict]) -> list[dict]:
    """Typo-tolerant fallback: only used when exact matching found nothing.

    Compares query words (length >= 5) against each record's brand
    identity words. Allowed edit distance is 1 for 5-7 letter words and 2
    for 8+ letter words. ``matchedTerm`` is the query word that fired so
    multiple fuzzy hits are never suppressed against each other.
    """
    query_tokens = {
        word
        for word in query.split()
        if len(word) >= 5 and word.isalpha() and word not in _FUZZY_STOP
    }
    if not query_tokens:
        return []
    matches: list[dict] = []
    for record in records:
        best = ""
        for token in query_tokens:
            for word in _identity_words(record):
                limit = 1 if len(word) <= 7 and len(token) <= 7 else 2
                if _edit_distance_within(token, word, limit):
                    if len(token) > len(best):
                        best = token
                    break
            if best:
                break
        if best:
            matches.append({"record": record, "matchedTerm": best})
    matches.sort(key=lambda m: len(m["matchedTerm"]), reverse=True)
    return matches


def _exact_matches(query: str, records: list[dict]) -> list[dict]:
    matches: list[dict] = []
    for record in records:
        terms = [
            normalize_text(t)
            for t in (
                [
                    record["brand"],
                    record.get("brandName"),
                    record["genericName"],
                    record.get("registrationNumber"),
                ]
                + list(record.get("activeIngredients") or [])
                + list(record.get("aliases") or [])
            )
            if t
        ]
        best = ""
        for term in terms:
            if contains_term(query, term) and len(term) > len(best):
                best = term
        if best:
            matches.append({"record": record, "matchedTerm": best})
    return matches


def find_matches_in(query: str, records: list[dict]) -> list[dict]:
    """Match a normalized ``query`` against an arbitrary record list.

    Returns ``[{"record", "matchedTerm"}]`` sorted by matched-term length
    (longest first). Multiple formulations of one brand stay separate so
    their details are never mixed.

    Ambiguity rule: when a record matched only via a SHORTER term (e.g.
    "biogesic") and that term occurs in the query solely inside a LONGER
    matched term of another record (e.g. "biogesic 500"), the shorter match
    is suppressed - "Biogesic 500" questions must not drag in the 325 mg
    record. Bare mentions ("Tell me about Biogesic") keep every formulation.

    When nothing matches exactly, a bounded fuzzy fallback tolerates typos
    in brand names ("Gavisvon" -> Gaviscon); it never fires alongside
    exact matches.
    """
    if not query:
        return []

    matches = _exact_matches(query, records)
    if not matches:
        return _fuzzy_matches(query, records)

    matches.sort(key=lambda m: len(m["matchedTerm"]), reverse=True)

    result: list[dict] = []
    for match in matches:
        term = match["matchedTerm"]
        longer = [
            other["matchedTerm"]
            for other in matches
            if len(other["matchedTerm"]) > len(term)
        ]
        if longer:
            residual = query
            for longer_term in longer:
                residual = residual.replace(longer_term, " ")
            if not contains_term(residual, term):
                continue  # mentioned only inside a more specific match
        result.append(match)
    return result


def find_medicine_matches(text: str) -> list[dict]:
    """Return ``[{"record", "matchedTerm"}]`` for every record named in ``text``.

    Matches against the verified record set (``MEDICINE_RECORDS``). See
    ``find_matches_in`` for sorting and ambiguity rules.
    """
    query = normalize_text(text)
    if not query:
        return []
    return find_matches_in(query, MEDICINE_RECORDS)


def recognized_label(matches: list[dict]) -> str | None:
    """Human-readable normalization label, e.g. "Biogesic 325 mg Tablet"."""
    if not matches:
        return None
    return " · ".join(m["record"]["brand"] for m in matches)


def card_view(record: dict) -> dict:
    """Strip a record down to the medicine-card fields (JSON-safe)."""
    return {k: record.get(k) for k in CARD_FIELDS}
