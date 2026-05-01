"""
memory_service.py
-----------------
Redis-backed chat history store.

Each session's history is stored as a JSON-encoded list under the Redis key:
    chat_history:<sessionId>

Operations:
  - append_message()  → push one {role, content} dict to the list
  - get_history()     → return last N messages
  - Both operations refresh the 24-hour TTL on every call.
"""

import json
import logging
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# ── Module-level async Redis client (lazy-init via get_redis()) ───────────────
_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return (or initialise) the shared async Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


def _session_key(session_id: str) -> str:
    return f"chat_history:{session_id}"


async def append_message(session_id: str, role: str, content: str) -> None:
    """
    Append a single message dict to the session's history list and
    reset the 24-hour TTL.
    """
    client = await get_redis()
    key = _session_key(session_id)

    try:
        # Fetch existing history
        raw = await client.get(key)
        history: list[dict] = json.loads(raw) if raw else []

        # Append new message
        history.append({"role": role, "content": content})

        # Persist and (re)set TTL
        await client.set(key, json.dumps(history), ex=settings.REDIS_TTL_SECONDS)
        logger.debug("Appended message to session '%s' (total=%d)", session_id, len(history))

    except Exception as exc:
        logger.error("Redis append_message failed for session '%s': %s", session_id, exc)
        # Non-fatal — chat can still proceed without persisted history
        raise


async def get_history(session_id: str, window: int = settings.HISTORY_WINDOW) -> list[dict]:
    """
    Return the last `window` messages for the given session.
    Returns an empty list if no history exists or Redis is unavailable.
    """
    client = await get_redis()
    key = _session_key(session_id)

    try:
        raw = await client.get(key)
        if not raw:
            return []

        history: list[dict] = json.loads(raw)

        # Refresh TTL on read
        await client.expire(key, settings.REDIS_TTL_SECONDS)

        return history[-window:]

    except Exception as exc:
        logger.error("Redis get_history failed for session '%s': %s", session_id, exc)
        return []
