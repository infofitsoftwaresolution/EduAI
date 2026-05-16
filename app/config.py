from dotenv import load_dotenv
import os

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-5.4-mini")
# New collection when switching embed models (HF MiniLM 384-dim → OpenAI 1536-dim).
VECTOR_COLLECTION_NAME = os.getenv("VECTOR_COLLECTION_NAME", "rag_knowledge_base_openai")
DATABASE_URL = os.getenv("DATABASE_URL")

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production-use-long-random-string")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

# Default admin seeded on startup if no user with this email exists
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@eduai.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "EduAI_Admin_2026")


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

_LOCAL_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


def cors_allow_origins() -> list[str]:
    """Origins passed to CORSMiddleware (explicit list is more reliable than regex alone)."""
    merged = list(FRONTEND_ORIGINS)
    if ALLOW_LOCALHOST_CORS:
        for origin in _LOCAL_DEV_ORIGINS:
            if origin not in merged:
                merged.append(origin)
    return merged