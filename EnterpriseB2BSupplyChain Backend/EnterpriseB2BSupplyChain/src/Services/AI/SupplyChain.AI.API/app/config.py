"""
config.py
---------
Centralised settings loaded from environment variables / .env file.
All other modules import from here — never from os.environ directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # Reads .env if present; harmless in production (Docker injects env vars)


class Settings:
    # ── Groq ──────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_TTL_SECONDS: int = 60 * 60 * 24  # 24 hours

    # ── Chat history ──────────────────────────────────────────────────────────
    HISTORY_WINDOW: int = 5  # number of recent messages sent to the LLM

    # ── FAISS knowledge base ─────────────────────────────────────────────────
    FAISS_TOP_K: int = 3              # number of nearest-neighbour policy chunks to retrieve
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")
        if o.strip()
    ]


settings = Settings()
