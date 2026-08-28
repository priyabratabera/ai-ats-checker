from openai import APIConnectionError, APIStatusError, AsyncOpenAI

from app.core.config import Settings
from app.schemas.ai_engine import LLMAnalysisResult
from app.services.llm.base import LLMProvider, LLMProviderError
from app.services.llm.json_utils import extract_json_object
from app.services.llm.prompts import SYSTEM_PROMPT, build_user_prompt


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self, settings: Settings):
        if not settings.openai_api_key:
            raise LLMProviderError("OPENAI_API_KEY is not configured.")
        self._model = settings.openai_model
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    def model_name(self) -> str:
        return self._model

    async def analyze_semantic_match(self, resume_text: str, jd_text: str) -> LLMAnalysisResult:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(resume_text, jd_text)},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
        except (APIStatusError, APIConnectionError) as exc:
            raise LLMProviderError(f"OpenAI request failed: {exc}") from exc

        content = response.choices[0].message.content or ""
        try:
            payload = extract_json_object(content)
            return LLMAnalysisResult.model_validate(payload)
        except Exception as exc:
            raise LLMProviderError(f"OpenAI returned unparseable output: {exc}") from exc
