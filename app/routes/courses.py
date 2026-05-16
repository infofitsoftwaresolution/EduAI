import os
import re
import shutil
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth.deps import require_admin
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Course, KnowledgeAsset, Section
from app.db.session import get_db
from app.services.loader import load_document, load_url
from app.services.splitter import split_documents
from app.services.vector_cleanup import delete_embeddings_for_course_id, delete_embeddings_for_document_ids
from app.services.vectorstore import get_vectorstore

router = APIRouter(prefix="/courses", tags=["Courses"], dependencies=[Depends(require_admin)])

# Local object storage; same relative paths can later map to S3 keys.
UPLOAD_DIR = "./data"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _safe_filename(name: str) -> str:
    base = os.path.basename(name or "file")
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return (cleaned[:200] or "file") if cleaned else "file"


def _unlink_storage(asset: KnowledgeAsset) -> None:
    if asset.source_type == "file" and asset.storage_path:
        path = os.path.join(UPLOAD_DIR, asset.storage_path)
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass


def _section_or_404(db: Session, course_id: UUID, section_id: UUID) -> Section:
    sec = db.get(Section, section_id)
    if sec is None or sec.course_id != course_id:
        raise HTTPException(status_code=404, detail="Section not found in this course")
    return sec


def _asset_or_404(db: Session, course_id: UUID, section_id: UUID, asset_id: UUID) -> KnowledgeAsset:
    asset = db.get(KnowledgeAsset, asset_id)
    if asset is None or asset.course_id != course_id or asset.section_id != section_id:
        raise HTTPException(status_code=404, detail="Asset not found in this section")
    return asset


def _course_or_404(db: Session, course_id: UUID) -> Course:
    c = db.get(Course, course_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return c


def _attach_chunk_metadata(docs, course_id: UUID, section_id: UUID, document_id: UUID, source_type: str, label: str):
    cid, sid, did = str(course_id), str(section_id), str(document_id)
    for doc in docs:
        base = dict(doc.metadata) if doc.metadata else {}
        doc.metadata = {
            **base,
            "course_id": cid,
            "section_id": sid,
            "document_id": did,
            "source_type": source_type,
            "label": label,
        }


# --- Schemas ---


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = Field(None, max_length=8000)


class CourseOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    model_config = {"from_attributes": True}


class CourseListItemOut(CourseOut):
    module_count: int = 0
    file_count: int = 0


class SectionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    position: int = 0


class SectionOut(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    position: int
    model_config = {"from_attributes": True}


class AssetOut(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    section_id: uuid.UUID
    source_type: str
    label: str
    chunks_count: int
    status: str = "ready"
    error_message: str | None = None
    model_config = {"from_attributes": True}


class UrlIngestBody(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)


# --- Courses ---


@router.post("", summary="Create a course")
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    c = Course(title=payload.title.strip(), description=payload.description.strip() if payload.description else None)
    db.add(c)
    db.commit()
    db.refresh(c)
    return CourseOut.model_validate(c)


@router.get("", summary="List courses with module and file counts")
def list_courses(db: Session = Depends(get_db)):
    rows = db.scalars(select(Course).order_by(Course.created_at.desc())).all()
    result: list[CourseListItemOut] = []
    for c in rows:
        module_count = db.scalar(
            select(func.count()).select_from(Section).where(Section.course_id == c.id)
        ) or 0
        file_count = db.scalar(
            select(func.count()).select_from(KnowledgeAsset).where(KnowledgeAsset.course_id == c.id)
        ) or 0
        base = CourseOut.model_validate(c)
        result.append(
            CourseListItemOut(
                **base.model_dump(),
                module_count=module_count,
                file_count=file_count,
            )
        )
    return result


@router.get("/{course_id}", summary="Get course with sections")
def get_course(course_id: UUID, db: Session = Depends(get_db)):
    c = _course_or_404(db, course_id)
    sections = db.scalars(
        select(Section).where(Section.course_id == course_id).order_by(Section.position, Section.created_at)
    ).all()
    return {
        "course": CourseOut.model_validate(c),
        "sections": [SectionOut.model_validate(s) for s in sections],
    }


@router.delete("/{course_id}", summary="Delete course, all vectors for the course, and uploaded files under data/")
def delete_course(course_id: UUID, db: Session = Depends(get_db)):
    c = _course_or_404(db, course_id)
    assets = db.scalars(select(KnowledgeAsset).where(KnowledgeAsset.course_id == course_id)).all()
    for a in assets:
        _unlink_storage(a)
    delete_embeddings_for_course_id(str(course_id))
    db.delete(c)
    db.commit()
    path = os.path.join(UPLOAD_DIR, str(course_id))
    if os.path.isdir(path):
        shutil.rmtree(path, ignore_errors=True)
    return {"message": "Course deleted", "course_id": str(course_id)}


# --- Sections ---


@router.post("/{course_id}/sections", summary="Create a section in a course")
def create_section(course_id: UUID, payload: SectionCreate, db: Session = Depends(get_db)):
    _course_or_404(db, course_id)
    s = Section(course_id=course_id, title=payload.title.strip(), position=payload.position)
    db.add(s)
    db.commit()
    db.refresh(s)
    return SectionOut.model_validate(s)


@router.get("/{course_id}/sections", summary="List sections in a course")
def list_sections(course_id: UUID, db: Session = Depends(get_db)):
    _course_or_404(db, course_id)
    rows = db.scalars(
        select(Section).where(Section.course_id == course_id).order_by(Section.position, Section.created_at)
    ).all()
    return [SectionOut.model_validate(r) for r in rows]


@router.delete("/{course_id}/sections/{section_id}", summary="Delete section and its knowledge vectors")
def delete_section(course_id: UUID, section_id: UUID, db: Session = Depends(get_db)):
    sec = _section_or_404(db, course_id, section_id)
    assets = db.scalars(select(KnowledgeAsset).where(KnowledgeAsset.section_id == section_id)).all()
    doc_ids = [str(a.id) for a in assets]
    for a in assets:
        _unlink_storage(a)
    delete_embeddings_for_document_ids(doc_ids)
    db.delete(sec)
    db.commit()
    path = os.path.join(UPLOAD_DIR, str(course_id), str(section_id))
    if os.path.isdir(path):
        shutil.rmtree(path, ignore_errors=True)
    return {"message": "Section deleted", "section_id": str(section_id)}


# --- Assets ---


@router.get("/{course_id}/sections/{section_id}/assets", summary="List assets in a section")
def list_assets(course_id: UUID, section_id: UUID, db: Session = Depends(get_db)):
    _section_or_404(db, course_id, section_id)
    rows = db.scalars(
        select(KnowledgeAsset).where(KnowledgeAsset.section_id == section_id).order_by(KnowledgeAsset.created_at.desc())
    ).all()
    return [AssetOut.model_validate(r) for r in rows]


@router.post("/{course_id}/sections/{section_id}/assets/file", summary="Upload a file into a section")
async def ingest_file_to_section(
    course_id: UUID,
    section_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _section_or_404(db, course_id, section_id)

    allowed = {".pdf", ".docx", ".txt"}
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    label = filename
    asset = KnowledgeAsset(
        course_id=course_id,
        section_id=section_id,
        source_type="file",
        label=label,
        storage_path=None,
        chunks_count=0,
        status="processing",
        error_message=None,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    rel_dir = os.path.join(str(course_id), str(section_id))
    disk_name = f"{asset.id}_{_safe_filename(filename)}"
    rel_path = os.path.join(rel_dir, disk_name).replace("\\", "/")
    abs_dir = os.path.join(UPLOAD_DIR, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)
    abs_path = os.path.join(UPLOAD_DIR, rel_path)

    try:
        with open(abs_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        docs = load_document(abs_path)
        chunks = split_documents(docs)
        _attach_chunk_metadata(chunks, course_id, section_id, asset.id, "file", label)

        vs = get_vectorstore()
        vs.add_documents(chunks)

        asset.storage_path = rel_path.replace("\\", "/")
        asset.chunks_count = len(chunks)
        asset.status = "ready"
        asset.error_message = None
        db.commit()
        db.refresh(asset)
    except Exception as e:
        err = str(e)
        try:
            delete_embeddings_for_document_ids([str(asset.id)])
        except Exception:
            pass
        if abs_path and os.path.isfile(abs_path):
            try:
                os.remove(abs_path)
            except OSError:
                pass
        asset.status = "failed"
        asset.error_message = err[:2000]
        asset.chunks_count = 0
        db.commit()
        db.refresh(asset)
        raise HTTPException(status_code=500, detail=err)

    return {
        "message": "File ingested successfully",
        "asset": AssetOut.model_validate(asset),
        "chunks_added": asset.chunks_count,
    }


@router.post("/{course_id}/sections/{section_id}/assets/url", summary="Ingest a URL into a section")
def ingest_url_to_section(course_id: UUID, section_id: UUID, payload: UrlIngestBody, db: Session = Depends(get_db)):
    _section_or_404(db, course_id, section_id)
    url = payload.url.strip()
    label = url

    asset = KnowledgeAsset(
        course_id=course_id,
        section_id=section_id,
        source_type="url",
        label=label,
        storage_path=None,
        chunks_count=0,
        status="processing",
        error_message=None,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    try:
        docs = load_url(url)
        chunks = split_documents(docs)
        _attach_chunk_metadata(chunks, course_id, section_id, asset.id, "url", label)
        vs = get_vectorstore()
        vs.add_documents(chunks)
        asset.chunks_count = len(chunks)
        asset.status = "ready"
        asset.error_message = None
        db.commit()
        db.refresh(asset)
    except Exception as e:
        err = str(e)
        try:
            delete_embeddings_for_document_ids([str(asset.id)])
        except Exception:
            pass
        asset.status = "failed"
        asset.error_message = err[:2000]
        asset.chunks_count = 0
        db.commit()
        db.refresh(asset)
        raise HTTPException(status_code=500, detail=err)

    return {
        "message": "URL ingested successfully",
        "asset": AssetOut.model_validate(asset),
        "chunks_added": asset.chunks_count,
    }


@router.delete("/{course_id}/sections/{section_id}/assets/{asset_id}", summary="Remove an asset from the knowledge base")
def delete_asset(course_id: UUID, section_id: UUID, asset_id: UUID, db: Session = Depends(get_db)):
    asset = _asset_or_404(db, course_id, section_id, asset_id)
    delete_embeddings_for_document_ids([str(asset.id)])
    _unlink_storage(asset)
    db.delete(asset)
    db.commit()
    return {"message": "Asset removed from knowledge base", "asset_id": str(asset_id)}
