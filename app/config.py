from dotenv import load_dotenv
import os

load_dotenv()

HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
LLM_MODEL = os.getenv("LLM_MODEL", "Qwen/Qwen2.5-72B-Instruct")
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