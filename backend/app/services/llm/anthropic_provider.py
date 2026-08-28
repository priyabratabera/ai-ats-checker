from anthropic import APIConnectionError, APIStatusError, AsyncAnthropic

from app.core.config import Settings
from app.schemas.ai_engine import LLMAnalysisResult
from app.services.llm.base import LLMProvider, LLMProviderError
from app.services.llm.json_utils import extract_json_object
from app.services.llm.prompts import SYSTEM_PROMPT, build_user_prompt


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, settings: Settings):
        if not settings.anthropic_api_key:
            raise LLMProviderError("ANTHROPIC_API_KEY is not configured.")
        self._model = settings.anthropic_model
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    def model_name(self) -> str:
        return self._model

    async def analyze_semantic_match(self, resume_text: str, jd_text: str) -> LLMAnalysisResult:
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": build_user_prompt(resume_text, jd_text)}],
            )
        except (APIStatusError, APIConnectionError) as exc:
            raise LLMProviderError(f"Anthropic request failed: {exc}") from exc

        if response.stop_reason == "refusal":
            raise LLMProviderError("Anthropic declined to respond (refusal).")

        text_block = next((b for b in response.content if b.type == "text"), None)
        if text_block is None:
            raise LLMProviderError("Anthropic response had no text content.")

        try:
            payload = extract_json_object(text_block.text)
            return LLMAnalysisResult.model_validate(payload)
        except Exception as exc:
            raise LLMProviderError(f"Anthropic returned unparseable output: {exc}") from exc
