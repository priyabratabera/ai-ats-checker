from app.core.config import Settings, get_settings
from app.services.llm.base import LLMProvider


def get_llm_provider(settings: Settings | None = None) -> LLMProvider:
    settings = settings or get_settings()

    if settings.ai_provider == "openai":
        from app.services.llm.openai_provider import OpenAIProvider

        return OpenAIProvider(settings)

    if settings.ai_provider == "anthropic":
        from app.services.llm.anthropic_provider import AnthropicProvider

        return AnthropicProvider(settings)

    from app.services.llm.ollama_provider import OllamaProvider

    return OllamaProvider(settings)
