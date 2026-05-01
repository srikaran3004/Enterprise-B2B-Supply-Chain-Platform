"""
main.py
-------
FastAPI application entry point for SupplyChain.AI.API.

Startup sequence:
  1. FastAPI lifespan initialises the ChromaDB knowledge base (embedding model
     is downloaded on first run, then cached by sentence-transformers).
  2. CORS middleware is configured to allow the Angular dev server at
     http://localhost:4200.
  3. The chat router is mounted under /api.
  4. Uvicorn serves the app on 0.0.0.0:8000.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.router import router
from app.services.knowledge_service import initialise_knowledge_base

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan (replaces deprecated @app.on_event) ─────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code above `yield` runs at startup; code below runs at shutdown.
    """
    logger.info("=== SupplyChain.AI.API starting up ===")
    logger.info("GROQ model : %s", settings.GROQ_MODEL)
    logger.info("Redis URL  : %s", settings.REDIS_URL)
    logger.info("CORS origins: %s", settings.CORS_ORIGINS)

    # Initialise ChromaDB + embed policy documents
    initialise_knowledge_base()

    logger.info("=== Startup complete — ready to serve requests ===")
    yield
    # Shutdown hooks (if needed) go here
    logger.info("=== SupplyChain.AI.API shutting down ===")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="SupplyChain.AI.API",
    description=(
        "AI-powered RAG microservice for the HUL Enterprise B2B Supply Chain Platform. "
        "Combines Groq (llama-3.3-70b-versatile), ChromaDB vector search, and "
        "Redis session memory to deliver grounded, policy-aware chat responses."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc UI
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,   # e.g. ["http://localhost:4200"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(router)


# ── Dev entrypoint ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,        # hot-reload for local development
        log_level="info",
    )
