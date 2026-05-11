from dotenv import load_dotenv
import os

load_dotenv()

HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
LLM_MODEL = os.getenv("LLM_MODEL", "Qwen/Qwen2.5-72B-Instruct")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
DATABASE_URL = os.getenv("DATABASE_URL")


def _parse_csv_env(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


# Comma-separated list, e.g. "https://lms.client.com,https://app.client.com"
FRONTEND_ORIGINS = _parse_csv_env(os.getenv("FRONTEND_ORIGINS"))

# Keep localhost allowed during local development only.
ALLOW_LOCALHOST_CORS = os.getenv("ALLOW_LOCALHOST_CORS", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}