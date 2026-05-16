from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.models import ChatMessage, ChatSession, User
from app.db.session import get_db

router = APIRouter(prefix="/api/sessions", tags=["Chat sessions"])

WINDOW_SIZE = 50


class SessionCreate(BaseModel):
    title: str | None = Field(None, max_length=512)
    course_id: str | None = None
    section_id: str | None = None


class SessionOut(BaseModel):
    id: str
    title: str
    course_id: str | None
    section_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    sources: list | dict | None
    created_at: datetime


class SessionDetailOut(BaseModel):
    session: SessionOut
    messages: list[MessageOut]


class LegacyHistoryTurn(BaseModel):
    question: str
    answer: str


class LegacySessionOut(BaseModel):
    session_id: str
    turns: int
    history: list[LegacyHistoryTurn]


def _parse_uuid(value: str | None) -> UUID | None:
    if not value or not str(value).strip():
        return None
    try:
        return UUID(str(value).strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {value}") from exc


def _session_out(row: ChatSession) -> SessionOut:
    return SessionOut(
        id=str(row.id),
        title=row.title,
        course_id=str(row.course_id) if row.course_id else None,
        section_id=str(row.section_id) if row.section_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _get_owned_session(db: Session, session_id: UUID, user_id: UUID) -> ChatSession:
    row = db.get(ChatSession, session_id)
    if row is None or row.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return row


@router.post("", response_model=SessionOut, summary="Create a new chat session")
def create_session(
    payload: SessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = (payload.title or "").strip() or "New chat"
    row = ChatSession(
        user_id=user.id,
        title=title,
        course_id=_parse_uuid(payload.course_id),
        section_id=_parse_uuid(payload.section_id),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _session_out(row)


@router.get("", response_model=list[SessionOut], summary="List your chat sessions")
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    ).all()
    return [_session_out(r) for r in rows]


@router.get("/{session_id}", response_model=SessionDetailOut, summary="Get session with messages")
def get_session_detail(
    session_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _get_owned_session(db, session_id, user.id)
    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()
    return SessionDetailOut(
        session=_session_out(row),
        messages=[
            MessageOut(
                id=str(m.id),
                role=m.role,
                content=m.content,
                sources=m.sources,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.get("/{session_id}/legacy", response_model=LegacySessionOut, summary="Legacy history shape for older clients")
def get_session_legacy(
    session_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_session(db, session_id, user.id)
    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    history: list[LegacyHistoryTurn] = []
    pending_q: str | None = None
    for m in messages:
        if m.role == "user":
            pending_q = m.content
        elif m.role == "assistant" and pending_q is not None:
            history.append(LegacyHistoryTurn(question=pending_q, answer=m.content))
            pending_q = None

    return LegacySessionOut(
        session_id=str(session_id),
        turns=len(history),
        history=history[-5:],
    )


@router.delete("/{session_id}", summary="Delete a chat session")
def delete_session(
    session_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _get_owned_session(db, session_id, user.id)
    db.delete(row)
    db.commit()
    return {"message": "Session deleted", "session_id": str(session_id)}
