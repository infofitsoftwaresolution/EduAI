from langchain_postgres import PGVector
from app.services.embedder import get_embedder
from app.config import DATABASE_URL, VECTOR_COLLECTION_NAME

COLLECTION_NAME = VECTOR_COLLECTION_NAME


def get_vectorstore():
    return PGVector(
        embeddings=get_embedder(),
        collection_name=COLLECTION_NAME,
        connection=DATABASE_URL,
    )