"""
Embeddings via the HuggingFace Inference API.

We intentionally avoid `langchain-huggingface` / `sentence-transformers` /
`torch` here so the backend container stays small enough to fit on cheap
hosting tiers (Render Starter, free Postgres add-ons, etc.).

The class implements the langchain `Embeddings` interface, so it is a
drop-in replacement for `HuggingFaceEmbeddings` inside `PGVector`.
"""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import List

import numpy as np
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError
from langchain_core.embeddings import Embeddings

from app.config import EMBEDDING_MODEL, HUGGINGFACEHUB_API_TOKEN

logger = logging.getLogger(__name__)

# Parallelism for batch embedding. HF Inference API is rate-limited, so a
# small pool keeps throughput high without tripping limits.
_MAX_WORKERS = 8

# Retry config for transient HF Inference API errors (cold start 503, 429, etc.).
_MAX_RETRIES = 4
_BACKOFF_SECONDS = 1.5


class HFInferenceAPIEmbeddings(Embeddings):
    """Embeddings backed by the HuggingFace Inference API.

    No local model is loaded; every embed call is a network round-trip.
    Vectors are L2-normalized so cosine similarity stays comparable to the
    previous `HuggingFaceEmbeddings(normalize_embeddings=True)` setup.
    """

    def __init__(self, model: str, token: str | None) -> None:
        if not token:
            raise RuntimeError(
                "HUGGINGFACEHUB_API_TOKEN is required for HF Inference API embeddings."
            )
        if not model:
            raise RuntimeError("EMBEDDING_MODEL is required.")
        self._model = model
        self._client = InferenceClient(api_key=token)

    def _embed_one(self, text: str) -> List[float]:
        # Empty / whitespace-only inputs would otherwise raise on the server.
        safe_text = text if text and text.strip() else " "

        last_err: Exception | None = None
        for attempt in range(_MAX_RETRIES):
            try:
                raw = self._client.feature_extraction(safe_text, model=self._model)
                break
            except HfHubHTTPError as err:
                status = getattr(getattr(err, "response", None), "status_code", None)
                # 503 = model loading, 429 = rate limit. Both are retryable.
                if status in {429, 503} and attempt < _MAX_RETRIES - 1:
                    sleep_for = _BACKOFF_SECONDS * (2**attempt)
                    logger.warning(
                        "HF embeddings transient error (status=%s, attempt=%s/%s) — retrying in %.1fs",
                        status,
                        attempt + 1,
                        _MAX_RETRIES,
                        sleep_for,
                    )
                    time.sleep(sleep_for)
                    last_err = err
                    continue
                raise
            except Exception as err:  # noqa: BLE001 — surface any other failure
                last_err = err
                raise
        else:
            # Loop exhausted without break — re-raise the last error.
            assert last_err is not None
            raise last_err

        arr = np.asarray(raw, dtype=np.float32)

        # HF returns either [dim] (already pooled for sentence-transformers models)
        # or [seq_len, dim] (raw transformer). Reduce to [dim] with mean pooling.
        if arr.ndim > 1:
            arr = arr.reshape(-1, arr.shape[-1]).mean(axis=0)

        norm = float(np.linalg.norm(arr))
        if norm > 0.0:
            arr = arr / norm
        return arr.astype(np.float32).tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if len(texts) == 1:
            return [self._embed_one(texts[0])]
        with ThreadPoolExecutor(max_workers=min(_MAX_WORKERS, len(texts))) as pool:
            return list(pool.map(self._embed_one, texts))

    def embed_query(self, text: str) -> List[float]:
        return self._embed_one(text)


def get_embedder() -> Embeddings:
    return HFInferenceAPIEmbeddings(
        model=EMBEDDING_MODEL,
        token=HUGGINGFACEHUB_API_TOKEN,
    )
