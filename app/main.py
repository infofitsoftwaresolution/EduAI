from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOW_LOCALHOST_CORS, FRONTEND_ORIGINS, cors_allow_origins
from app.db.models import Base
from app.db.schema_upgrade import ensure_schema
from app.db.session import engine
from app.db.seed import seed_admin_user
from app.db.session import SessionLocal
from app.routes import auth, chat_sessions, courses, query

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        ensure_schema()
    except Exception:
        logger.exception("Schema upgrade failed — check DATABASE_URL and permissions")
        raise
    db = SessionLocal()
    try:
        seed_admin_user(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="RAG System API",
    description="Knowledge base ingestion and retrieval using LangChain + HuggingFace",
    version="1.0.0",
    lifespan=lifespan,
)

if not FRONTEND_ORIGINS:
    logging.getLogger("uvicorn.error").warning(
        "FRONTEND_ORIGINS is empty: set it to your Vercel URL(s) on Render or browser requests will fail CORS."
    )

_cors_origins = cors_allow_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if ALLOW_LOCALHOST_CORS else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat_sessions.router)
app.include_router(courses.router)
app.include_router(query.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "RAG system running"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
