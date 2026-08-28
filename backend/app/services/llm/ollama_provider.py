from ollama import AsyncClient, ResponseError

from app.core.config import Settings
from app.schemas.ai_engine import LLMAnalysisResult
from app.services.llm.base import LLMProvider, LLMProviderError
from app.services.llm.json_utils import extract_json_object
from app.services.llm.prompts import SYSTEM_PROMPT, build_user_prompt


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self, settings: Settings):
        self._model = settings.ollama_model
        self._client = AsyncClient(host=settings.ollama_base_url)

    def model_name(self) -> str:
        return self._model

    async def analyze_semantic_match(self, resume_text: str, jd_text: str) -> LLMAnalysisResult:
        try:
            response = await self._client.chat(
                model=self._model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(resume_text, jd_text)},
                ],
                format="json",
                options={"temperature": 0.2},
            )
        except ResponseError as exc:
            raise LLMProviderError(f"Ollama request failed: {exc}") from exc
        except Exception as exc:  # network errors, connection refused, etc.
            raise LLMProviderError(f"Could not reach Ollama at the configured host: {exc}") from exc

        content = response.message.content or ""
        try:
            payload = extract_json_object(content)
            return LLMAnalysisResult.model_validate(payload)
        except Exception as exc:
            raise LLMProviderError(f"Ollama returned unparseable output: {exc}") from exc
