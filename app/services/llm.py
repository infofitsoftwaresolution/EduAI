from langchain_openai import ChatOpenAI

from app.config import LLM_MODEL, OPENAI_API_KEY


def get_llm() -> ChatOpenAI:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is required for the chat model.")
    return ChatOpenAI(
        model=LLM_MODEL,
        api_key=OPENAI_API_KEY,
        max_tokens=512,
        temperature=0.2,
    )
