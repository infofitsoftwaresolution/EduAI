from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

from app.services.vectorstore import get_vectorstore
from app.services.llm import get_llm

router = APIRouter(prefix="/ask", tags=["Query"])

# in-memory session store  {session_id: [ {role, content}, ... ]}
session_store: dict = {}
WINDOW_SIZE = 5   # keep last 5 exchanges


class QueryRequest(BaseModel):
    question: str
    top_k: int = 4
    session_id: Optional[str] = "default"   # frontend passes this


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


def get_history(session_id: str) -> str:
    history = session_store.get(session_id, [])
    if not history:
        return "No previous conversation."
    lines = []
    for turn in history[-WINDOW_SIZE:]:     # only last K turns
        lines.append(f"User: {turn['question']}")
        lines.append(f"Assistant: {turn['answer']}")
    return "\n".join(lines)


def save_to_history(session_id: str, question: str, answer: str):
    if session_id not in session_store:
        session_store[session_id] = []
    session_store[session_id].append({
        "question": question,
        "answer": answer
    })


@router.post("/", summary="Ask a question against the knowledge base")
async def ask_question(payload: QueryRequest):
    try:
        vs = get_vectorstore()

        retriever = vs.as_retriever(
            search_type="mmr",
            search_kwargs={"k": payload.top_k}
        )

        prompt = PromptTemplate(
            template=PROMPT_TEMPLATE,
            input_variables=["history", "context", "question"]
        )

        history = get_history(payload.session_id)

        chain = (
            {
                "context": RunnableLambda(lambda x: x["question"]) | retriever | format_docs,
                "question": RunnableLambda(lambda x: x["question"]),
                "history": RunnableLambda(lambda x: x["history"]),
            }
            | prompt
            | get_llm()
            | StrOutputParser()
        )

        retrieved_docs = retriever.invoke(payload.question)
        answer = chain.invoke({
            "question": payload.question,
            "history": history
        })

        # save this turn to memory
        save_to_history(payload.session_id, payload.question, answer.strip())

        return {
            "session_id": payload.session_id,
            "question": payload.question,
            "answer": answer.strip(),
            "sources": [
                {
                    "filename": doc.metadata.get("source", "unknown").split("\\")[-1].split("/")[-1],
                    "page": doc.metadata.get("page", "—"),
                    "preview": doc.page_content[:200]
                }
                for doc in retrieved_docs
            ],
            "total_sources": len(retrieved_docs)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{session_id}", summary="Clear conversation history for a session")
async def clear_session(session_id: str):
    if session_id in session_store:
        del session_store[session_id]
    return {"message": f"Session {session_id} cleared"}


@router.get("/session/{session_id}", summary="Get conversation history for a session")
async def get_session(session_id: str):
    history = session_store.get(session_id, [])
    return {
        "session_id": session_id,
        "turns": len(history),
        "history": history[-WINDOW_SIZE:]
    }