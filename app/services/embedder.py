"""
Embeddings via the OpenAI API (text-embedding-3-small by default).

Drop-in langchain Embeddings implementation for PGVector.
"""

from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings

from app.config import EMBEDDING_MODEL, OPENAI_API_KEY


def get_embedder() -> Embeddings:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is required for embeddings.")
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=OPENAI_API_KEY,
    )
