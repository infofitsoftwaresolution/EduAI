from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ChatMessage, ChatSession

WINDOW_SIZE = 5


def get_session_for_user(db: Session, session_id: UUID, user_id: UUID) -> ChatSession | None:
    row = db.get(ChatSession, session_id)
    if row is None or row.user_id != user_id:
        return None
    return row


def format_history_for_prompt(db: Session, session_id: UUID) -> str:
    rows = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    turns: list[tuple[str, str]] = []
    pending_q: str | None = None
    for row in rows:
        if row.role == "user":
            pending_q = row.content
        elif row.role == "assistant" and pending_q is not None:
            turns.append((pending_q, row.content))
            pending_q = None

    if not turns:
        return "No previous conversation."

    lines: list[str] = []
    for q, a in turns[-WINDOW_SIZE:]:
        lines.append(f"User: {q}")
        lines.append(f"Assistant: {a}")
    return "\n".join(lines)


def append_message(
    db: Session,
    session_id: UUID,
    *,
    role: str,
    content: str,
    sources: list | dict | None = None,
) -> ChatMessage:
    msg = ChatMessage(session_id=session_id, role=role, content=content, sources=sources)
    db.add(msg)
    session = db.get(ChatSession, session_id)
    if session is not None:
        session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return msg
