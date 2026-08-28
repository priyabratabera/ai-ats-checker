from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analyze, health, job_descriptions, resumes
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="ATS Checker API",
    description=(
        "Deterministic ATS rule engine (Engine 1) + pluggable AI semantic "
        "engine (Engine 2: Ollama by default, OpenAI/Anthropic optional)."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(resumes.router)
app.include_router(job_descriptions.router)
app.include_router(analyze.router)
