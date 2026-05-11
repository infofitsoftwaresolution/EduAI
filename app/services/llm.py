from huggingface_hub import InferenceClient
from langchain_core.runnables import RunnableLambda
from app.config import HUGGINGFACEHUB_API_TOKEN, LLM_MODEL


_hf_client = InferenceClient(api_key=HUGGINGFACEHUB_API_TOKEN)


def _extract_prompt(prompt_input) -> str:
    # PromptTemplate output may be a PromptValue object; convert safely to plain text.
    if hasattr(prompt_input, "to_string"):
        return prompt_input.to_string()
    return str(prompt_input)


def _invoke_chat_completion(prompt_input):
    prompt_text = _extract_prompt(prompt_input)
    completion = _hf_client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt_text}],
        max_tokens=512,
    )
    if not completion.choices:
        return ""
    return completion.choices[0].message.content or ""


def get_llm():
    return RunnableLambda(_invoke_chat_completion)