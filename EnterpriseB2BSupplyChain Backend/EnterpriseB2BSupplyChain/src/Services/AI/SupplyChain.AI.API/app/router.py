"""
router.py
---------
FastAPI router defining the POST /api/chat endpoint.

Request flow:
  1. Validate the incoming ChatRequest (Pydantic).
  2. Persist the user message to Redis (memory_service).
  3. Retrieve last N messages from Redis as conversation history.
  4. Query ChromaDB for relevant policy context (knowledge_service).
  5. Call Groq LLM with system prompt + context + history (llm_service).
  6. Persist the assistant's reply to Redis.
  7. Return ChatResponse with reply + contextUsed.
"""

import logging

from fastapi import APIRouter, HTTPException, status, Header

from app.schemas import ChatRequest, ChatResponse
from app.services import memory_service, knowledge_service, llm_service
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a message to the HUL Supply Chain AI Assistant",
    response_description="The AI assistant's reply with policy context metadata",
)
async def chat(request: ChatRequest, authorization: str | None = Header(None)) -> ChatResponse:
    """
    **POST /api/chat**

    Accepts a user message, enriches it with policy knowledge and session memory,
    calls the Groq LLM, and returns the grounded assistant reply.

    - **message**: The user's natural-language query.
    - **role**: Sender role (`"user"` in normal client calls).
    - **sessionId**: Unique identifier that scopes the Redis chat history.
    """
    session_id = request.sessionId
    user_message = request.message.strip()

    if not user_message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="message must not be empty",
        )

    # ── Step 0.5: Semantic Intent Classification ──────────────────────────────
    if not knowledge_service.is_query_relevant(user_message):
        rejection_msg = (
            "I am your HUL Supply Chain Assistant. I can only answer questions related to "
            "orders, catalog, logistics, dealers, and company policies. Please rephrase your question."
        )
        try:
            await memory_service.append_message(session_id=session_id, role="user", content=user_message)
            await memory_service.append_message(session_id=session_id, role="assistant", content=rejection_msg)
        except Exception as exc:
            logger.warning("Could not persist rejection messages to Redis: %s", exc)

        return ChatResponse(
            reply=rejection_msg,
            sessionId=session_id,
            contextUsed=[]
        )

    # ── Step 1: Persist incoming user message ─────────────────────────────────
    try:
        await memory_service.append_message(
            session_id=session_id,
            role="user",
            content=user_message,
        )
    except Exception as exc:
        # Redis failure is logged but non-fatal; the chat still proceeds
        logger.warning("Could not persist user message to Redis: %s", exc)

    # ── Step 2: Retrieve chat history (last N messages) ───────────────────────
    history = await memory_service.get_history(
        session_id=session_id,
        window=settings.HISTORY_WINDOW,
    )

    # ── Step 3: Query FAISS knowledge base for relevant policy context ─────────
    policy_chunks = knowledge_service.query_knowledge(
        query_text=user_message,
        top_k=settings.FAISS_TOP_K,
    )

    # ── Step 4: Call Groq LLM ─────────────────────────────────────────────────
    try:
        reply = await llm_service.build_and_call_llm(
            user_message=user_message,
            policy_chunks=policy_chunks,
            chat_history=history,
            auth_header=authorization,
            user_role=request.role,
        )
    except Exception as exc:
        logger.error("LLM call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service temporarily unavailable: {exc}",
        )

    # ── Step 5: Persist assistant reply ───────────────────────────────────────
    try:
        await memory_service.append_message(
            session_id=session_id,
            role="assistant",
            content=reply,
        )
    except Exception as exc:
        logger.warning("Could not persist assistant reply to Redis: %s", exc)

    return ChatResponse(
        reply=reply,
        sessionId=session_id,
        contextUsed=policy_chunks,
    )


@router.get("/health", summary="Health check", tags=["Health"])
async def health() -> dict:
    """Lightweight liveness probe — returns 200 if the service is running."""
    return {"status": "healthy", "service": "SupplyChain.AI.API"}
