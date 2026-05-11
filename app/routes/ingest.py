from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from pydantic import BaseModel
import shutil, os

from app.services.loader import load_document, load_url
from app.services.splitter import split_documents
from app.services.vectorstore import get_vectorstore

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

UPLOAD_DIR = "./data"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Upload a file ──────────────────────────────────────────
@router.post("/file", summary="Upload a document to the knowledge base")
async def ingest_file(file: UploadFile = File(...)):
    allowed = {".pdf", ".docx", ".txt"}
    ext = os.path.splitext(file.filename)[-1].lower()

    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        docs = load_document(file_path)
        chunks = split_documents(docs)
        vs = get_vectorstore()
        vs.add_documents(chunks)
    except Exception as e:
        raise HTTPException(500, str(e))

    return {
        "message": "File ingested successfully",
        "filename": file.filename,
        "chunks_added": len(chunks)
    }


# ── Ingest a URL ───────────────────────────────────────────
class URLRequest(BaseModel):
    url: str

@router.post("/url", summary="Ingest a webpage URL into the knowledge base")
async def ingest_url(payload: URLRequest):
    try:
        docs = load_url(payload.url)
        chunks = split_documents(docs)
        vs = get_vectorstore()
        vs.add_documents(chunks)
    except Exception as e:
        raise HTTPException(500, str(e))

    return {
        "message": "URL ingested successfully",
        "url": payload.url,
        "chunks_added": len(chunks)
    }