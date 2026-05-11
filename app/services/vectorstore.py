from langchain_postgres import PGVector
from app.services.embedder import get_embedder
from app.config import DATABASE_URL

def get_vectorstore():
    return PGVector(
        embeddings=get_embedder(),
        collection_name="rag_knowledge_base",
        connection=DATABASE_URL,
    )