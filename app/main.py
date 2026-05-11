from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import ingest, query
from app.config import FRONTEND_ORIGINS, ALLOW_LOCALHOST_CORS

app = FastAPI(
    title="RAG System API",
    description="Knowledge base ingestion and retrieval using LangChain + HuggingFace",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if ALLOW_LOCALHOST_CORS else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(query.router)

@app.get("/", tags=["Health"])
def root():
    return {"status": "RAG system running"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}