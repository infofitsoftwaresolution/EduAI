from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda, RunnablePassthrough

from app.auth.deps import get_current_user
from app.db.models import ChatSession, User
from app.db.session import get_db
from app.services.chat_history import append_message, format_history_for_prompt, get_session_for_user
from app.services.llm import get_llm
from app.services.vectorstore import get_vectorstore

router = APIRouter(prefix="/ask", tags=["Query"])


class QueryRequest(BaseModel):
    question: str
    top_k: int = 4
    session_id: str
    course_id: str | None = None
    section_id: str | None = None


PROMPT_TEMPLATE = """
You are a helpful assistant that answers questions based on the provided context.
Always structure your response in clean, readable format.
Use bullet points or numbered lists where appropriate.
Be concise and direct.
If the answer is not in the context, say "I don't have enough information."

Previous conversation:
{history}

Context:
{context}

Question: {question}

Answer:"""


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


def _retriever_filter(course_id: str | None, section_id: str | None) -> dict | None:
    cid = (course_id or "").strip()
    sid = (section_id or "").strip()
    if sid:
        if not cid:
            raise ValueError("section_id requires course_id")
        return {"course_id": cid, "section_id": sid}
    if cid:
        return {"course_id": cid}
    return None


def _parse_session_id(session_id: str) -> UUID:
    try:
        return UUID(session_id.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid session_id") from exc


@router.post("/", summary="Ask a question against the knowledge base")
async def ask_question(
    payload: QueryRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        session_uuid = _parse_session_id(payload.session_id)
        chat_session = get_session_for_user(db, session_uuid, user.id)
        if chat_session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        filt = _retriever_filter(payload.course_id, payload.section_id)
        vs = get_vectorstore()

        search_kwargs: dict = {"k": payload.top_k}
        if filt is not None:
            search_kwargs["filter"] = filt

        retriever = vs.as_retriever(
            search_type="mmr",
            search_kwargs=search_kwargs,
        )

        retrieved_docs = retriever.invoke(payload.question)
        context = format_docs(retrieved_docs)
        history = format_history_for_prompt(db, session_uuid)

        prompt = PromptTemplate(
            template=PROMPT_TEMPLATE,
            input_variables=["history", "context", "question"],
        )

        chain = prompt | get_llm() | StrOutputParser()
        answer = chain.invoke(
            {
                "history": history,
                "context": context,
                "question": payload.question,
            }
        )
        answer = answer.strip()

        append_message(db, session_uuid, role="user", content=payload.question)

        sources_payload = [
            {
                "filename": (
                    doc.metadata.get("label") or doc.metadata.get("source", "unknown")
                )
                .split("\\")[-1]
                .split("/")[-1],
                "page": doc.metadata.get("page", "—"),
                "preview": doc.page_content[:200],
            }
            for doc in retrieved_docs
        ]
        append_message(db, session_uuid, role="assistant", content=answer, sources=sources_payload)

        if chat_session.title in ("New chat", "Untitled Session") or chat_session.title.startswith("Session "):
            title = payload.question.strip().replace("\n", " ")
            chat_session.title = title[:40] + ("..." if len(title) > 40 else "") if title else chat_session.title
            db.commit()

        return {
            "session_id": str(session_uuid),
            "question": payload.question,
            "answer": answer,
            "sources": sources_payload,
            "total_sources": len(retrieved_docs),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{session_id}", summary="Clear conversation (deprecated: use DELETE /api/sessions/{id})")
async def clear_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session_uuid = _parse_session_id(session_id)
    row = get_session_for_user(db, session_uuid, user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(row)
    db.commit()
    return {"message": f"Session {session_id} cleared"}


@router.get("/session/{session_id}", summary="Get history (deprecated: use GET /api/sessions/{id}/legacy)")
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select

    from app.db.models import ChatMessage

    session_uuid = _parse_session_id(session_id)
    if get_session_for_user(db, session_uuid, user.id) is None:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_uuid)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    history = []
    pending_q = None
    for m in messages:
        if m.role == "user":
            pending_q = m.content
        elif m.role == "assistant" and pending_q is not None:
            history.append({"question": pending_q, "answer": m.content})
            pending_q = None

    return {
        "session_id": session_id,
        "turns": len(history),
        "history": history[-5:],
    }
