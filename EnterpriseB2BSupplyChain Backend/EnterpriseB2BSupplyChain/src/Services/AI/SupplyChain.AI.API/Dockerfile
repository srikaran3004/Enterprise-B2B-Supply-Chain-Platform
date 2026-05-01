# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder — install Python deps into a clean venv
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# System build deps (needed by sentence-transformers / chromadb C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to exploit Docker layer cache
COPY requirements.txt .

# Install into an isolated venv so the final stage stays slim
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence-transformer model and validate faiss-cpu import
# so the container starts fast and fails early if the wheel is incompatible.
RUN /opt/venv/bin/python -c "\
from sentence_transformers import SentenceTransformer; \
import faiss, numpy as np; \
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); \
vec = model.encode(['smoke test'], convert_to_numpy=True).astype('float32'); \
idx = faiss.IndexFlatL2(vec.shape[1]); \
idx.add(vec); \
print('FAISS + sentence-transformers OK — dim=%d ntotal=%d' % (vec.shape[1], idx.ntotal))"


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime — lean production image
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Carry venv + cached model weights from builder
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /root/.cache /root/.cache

# Copy application source
COPY . .

# Activate venv for all subsequent commands
ENV PATH="/opt/venv/bin:$PATH"

# ── Environment defaults (overridden at runtime via docker run -e or compose) ──
ENV GROQ_API_KEY=""
ENV REDIS_URL="redis://redis:6379/0"
ENV GROQ_MODEL="llama-3.3-70b-versatile"
ENV CORS_ORIGINS="http://localhost:4200"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Expose the Uvicorn port
EXPOSE 8000

# Non-root user for security hardening
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Health check — polls the /api/health liveness probe every 30 s
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Production server — 2 workers, no reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
