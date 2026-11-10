"""Evidence-grounded answer generation with google/flan-t5-base.

Follows the notebook methodology (GroupApex_RAG_Experiment_Notebook.ipynb,
cells 13/15): seq2seq flan-t5, greedy decoding (deterministic), question
FIRST in the prompt, then a token-budgeted slice of the retrieved evidence.
The model is loaded lazily, cached, and guarded by a lock so concurrent
FastAPI requests never race the weights.
"""

import threading

from rag.config import GENERATION_MODEL, MAX_INPUT_TOKENS, MAX_NEW_TOKENS

_lock = threading.Lock()
_tokenizer = None
_model = None
_load_error: str | None = None

INSTRUCTION = (
    "You are a helpful assistant specializing in Philippine OTC medicine "
    "records. Answer ONLY using the evidence below. Do not invent facts, "
    "numbers, or citations. If the evidence does not contain enough "
    "information to answer, reply exactly: The source documents do not "
    "contain enough information to answer this question."
)

INSUFFICIENCY_MARKERS = (
    "do not contain enough information",
    "does not contain enough information",
    "not enough information",
    "cannot answer",
    "can not answer",
    "cannot be answered",
    "provided evidence does not",
    "evidence does not",
    "no information",
)


def is_loaded() -> bool:
    return _model is not None


def load_error() -> str | None:
    return _load_error


def _ensure_loaded() -> None:
    """Load tokenizer + model on first use (thread-safe)."""
    global _tokenizer, _model, _load_error
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            _tokenizer = AutoTokenizer.from_pretrained(GENERATION_MODEL)
            _model = AutoModelForSeq2SeqLM.from_pretrained(GENERATION_MODEL)
            _model.eval()
            _load_error = None
        except Exception as exc:  # offline / hub error: surface on health check
            _load_error = f"{type(exc).__name__}: {exc}"
            raise


def warmup() -> None:
    """Best-effort background preload; failures are reported via health."""
    try:
        _ensure_loaded()
    except Exception:
        pass


def _encode(tokenizer, text: str) -> list[int]:
    return tokenizer.encode(text, add_special_tokens=False, truncation=False)


def build_prompt(question: str, evidence_blocks: list[str]) -> str:
    """Question FIRST, then a token-budgeted slice of the evidence.

    Trimming happens only at token boundaries and only the first block may
    be cut, so the question can never be truncated away (notebook rule).
    """
    prefix = f"Question: {question}\n{INSTRUCTION}\nEvidence:\n"
    suffix = "\nAnswer:"

    prefix_tokens = _encode(_tokenizer, prefix)
    suffix_tokens = _encode(_tokenizer, suffix)
    remaining = (
        MAX_INPUT_TOKENS - len(prefix_tokens) - len(suffix_tokens) - 1
    )
    if remaining <= 0:
        raise ValueError("Question + instruction leave no room for evidence.")

    selected: list[str] = []
    for block in evidence_blocks:
        if remaining <= 0:
            break
        tokens = _encode(_tokenizer, block)
        sep = "\n\n" if selected else ""
        sep_tokens = _encode(_tokenizer, sep) if sep else []
        available = remaining - len(sep_tokens)
        if available <= 0:
            break
        if len(tokens) > available and selected:
            continue  # only the first block may be cut
        kept = tokens[:available]
        if not kept:
            break
        selected.append(
            _tokenizer.decode(kept, skip_special_tokens=True,
                              clean_up_tokenization_spaces=False)
        )
        remaining -= len(sep_tokens) + len(kept)
        if len(kept) < len(tokens):
            break

    return prefix + sep.join(selected) + suffix


def generate(question: str, evidence_blocks: list[str]) -> tuple[str, bool]:
    """Greedy-decode an answer grounded in ``evidence_blocks``.

    Returns ``(answer, truncated)`` where ``truncated`` is True when decoding
    hit the ``max_new_tokens`` cap (the text may end mid-sentence).

    Raises RuntimeError when the model is unavailable so the caller can
    fall back to a deterministic composed answer.
    """
    _ensure_loaded()

    import torch

    prompt = build_prompt(question, evidence_blocks)
    inputs = _tokenizer(
        prompt, return_tensors="pt", truncation=True,
        max_length=MAX_INPUT_TOKENS,
    )
    with _lock:  # one generation at a time on CPU
        with torch.no_grad():
            output_ids = _model.generate(
                **inputs,
                max_new_tokens=MAX_NEW_TOKENS,
                do_sample=False,  # greedy: deterministic, as in the experiment
            )
    answer = _tokenizer.decode(
        output_ids[0], skip_special_tokens=True
    ).strip()
    truncated = int(output_ids.shape[1]) >= MAX_NEW_TOKENS
    return answer, truncated


def indicates_insufficiency(answer: str) -> bool:
    lowered = (answer or "").lower()
    return any(marker in lowered for marker in INSUFFICIENCY_MARKERS)
