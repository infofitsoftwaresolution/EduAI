from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOW_LOCALHOST_CORS, FRONTEND_ORIGINS
from app.db.models import Base
from app.db.session import engine
from app.routes import courses, query


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if ALLOW_LOCALHOST_CORS else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router)
app.include_router(query.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "RAG system running"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
