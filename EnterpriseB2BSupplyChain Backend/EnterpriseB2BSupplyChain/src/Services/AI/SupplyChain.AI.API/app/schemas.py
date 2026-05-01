"""
schemas.py
----------
Pydantic request / response models for the chat endpoint.
"""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The user's chat message")
    role: str = Field(default="user", description="Sender role: 'user' or 'assistant'")
    sessionId: str = Field(..., description="Unique session identifier for memory isolation")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="The AI assistant's response")
    sessionId: str = Field(..., description="Echo of the incoming session ID")
    contextUsed: list[str] = Field(
        default_factory=list,
        description="Policy chunks retrieved from the knowledge base and injected as context",
    )
