"""
llm_service.py
--------------
Groq LLM integration using the llama-3.3-70b-versatile model.

build_and_call_llm() assembles the full message array:
    [system prompt]  →  [policy context]  →  [chat history]  →  [current user message]
and returns the assistant's reply as a plain string.
"""

import logging

import json
from groq import Groq

from app.config import settings
from app.services.tools import (
    get_order_status,
    approve_order,
    get_delivery_agents_count,
    get_admin_dashboard_summary,
    get_dealer_profile_summary
)

logger = logging.getLogger(__name__)

# ── Available Tools Schema ───────────────────────────────────────────────────
AVAILABLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "Retrieve the current status and details of a specific order. Use this tool when the user asks about the status of their order or needs specific order details like total amount, shipping address, or items.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The unique identifier (UUID or string) of the order."
                    }
                },
                "required": ["order_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "approve_order",
            "description": "Approve a pending order. Use this tool ONLY when an Admin or SuperAdmin explicitly requests to approve an order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The unique identifier (UUID or string) of the order to approve."
                    }
                },
                "required": ["order_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_delivery_agents_count",
            "description": "Retrieve the total number of registered delivery agents. Use this when an Admin asks for agent statistics.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_admin_dashboard_summary",
            "description": "Retrieve a comprehensive summary of all system statistics. Use this tool whenever an Admin asks ANY question about system statistics, counts, users, revenue, or global order statuses.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_dealer_profile_summary",
            "description": "Retrieve a comprehensive summary of the logged-in dealer's state. Use this tool when a Dealer asks about their credit limit, outstanding balance, total orders, active shipments, or general profile status.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are the HUL Supply Chain Assistant — an expert AI embedded inside \
Hindustan Unilever Limited's (HUL) Enterprise B2B Supply Chain Portal.

Your role is to help registered dealers, logistics managers, and supply chain executives with:
• Order placement, tracking, and status queries
• Return and refund policy clarifications
• Shipping fees, delivery timelines, and freight charges
• Minimum order quantities (MOQ) and catalogue information
• Credit terms, payment due dates, and invoice disputes
• Damaged goods claims and shortage reporting procedures

Guidelines:
1. Always ground your answers in the POLICY CONTEXT provided below (between the <context> tags).
2. If the policy context does not cover the question, say so honestly and suggest contacting the HUL support team.
3. Be concise, professional, and friendly. Use bullet points for multi-step answers.
4. Never fabricate policy details, prices, or timelines not present in the context.
5. Maintain continuity by referencing prior messages in the conversation history where relevant."""


def _format_context_block(policy_chunks: list[str]) -> str:
    """Wrap retrieved policy strings in a labelled XML-ish block for the LLM."""
    if not policy_chunks:
        return "<context>No specific policy context was retrieved for this query.</context>"

    numbered = "\n\n".join(
        f"[Policy {i + 1}] {chunk}" for i, chunk in enumerate(policy_chunks)
    )
    return f"<context>\n{numbered}\n</context>"


async def build_and_call_llm(
    user_message: str,
    policy_chunks: list[str],
    chat_history: list[dict],
    auth_header: str | None = None,
    user_role: str = "user",
) -> str:
    """
    Construct the full Groq message array and invoke the LLM.

    Message order:
      1. System prompt (role=system)
      2. Policy context injected as a system-level note (role=system)
      3. Recent chat history (role=user / role=assistant)
      4. The current user message (role=user)

    Args:
        user_message:   The raw text of the current user turn.
        policy_chunks:  Strings retrieved from ChromaDB/FAISS.
        chat_history:   Last N {role, content} dicts from Redis.
        auth_header:    Optional Bearer token for future downstream tool calls.
        user_role:      The caller's role to determine tool access.

    Returns:
        The assistant reply string.
    """
    # Define role-based tool access
    ROLE_TOOL_MAP = {
        "SuperAdmin": ["get_order_status", "approve_order", "get_delivery_agents_count", "get_admin_dashboard_summary"],
        "Admin": ["get_order_status", "approve_order", "get_delivery_agents_count", "get_admin_dashboard_summary"],
        "Dealer": ["get_order_status", "get_dealer_profile_summary"]
    }
    
    allowed_tool_names = ROLE_TOOL_MAP.get(user_role, [])
    allowed_tools = [t for t in AVAILABLE_TOOLS if t["function"]["name"] in allowed_tool_names]

    client = Groq(api_key=settings.GROQ_API_KEY)

    messages: list[dict] = []

    # 1. System prompt
    messages.append({"role": "system", "content": SYSTEM_PROMPT})

    # 2. Policy context block
    context_block = _format_context_block(policy_chunks)
    messages.append({
        "role": "system",
        "content": (
            "Use the following supply chain policy context to answer the user's question:\n\n"
            + context_block
        ),
    })

    # 3. Chat history (already in {role, content} format from Redis)
    for entry in chat_history:
        role = entry.get("role", "user")
        if role not in ("system", "user", "assistant", "tool"):
            role = "user"
        messages.append({"role": role, "content": entry.get("content", "")})

    # 4. Current user message
    messages.append({"role": "user", "content": user_message})

    logger.debug(
        "Sending %d messages to Groq (%s) — context chunks: %d, history: %d",
        len(messages),
        settings.GROQ_MODEL,
        len(policy_chunks),
        len(chat_history),
    )

    try:
        kwargs = {
            "model": settings.GROQ_MODEL,
            "messages": messages,
            "temperature": 0.4,
            "max_tokens": 1024,
            "top_p": 0.9,
        }
        
        if allowed_tools:
            kwargs["tools"] = allowed_tools
            kwargs["tool_choice"] = "auto"
            
        response = client.chat.completions.create(**kwargs)
        
        # Check if the LLM wants to call any tools
        if response.choices[0].message.tool_calls:
            # Append the LLM's message indicating tool calls
            messages.append(response.choices[0].message)
            
            for tool_call in response.choices[0].message.tool_calls:
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                logger.info(f"LLM triggered tool: {function_name} with args: {arguments}")
                
                if function_name == "get_order_status":
                    result = await get_order_status(arguments.get("order_id", ""), auth_header or "")
                elif function_name == "approve_order":
                    result = await approve_order(arguments.get("order_id", ""), auth_header or "")
                elif function_name == "get_delivery_agents_count":
                    result = await get_delivery_agents_count(auth_header or "")
                elif function_name == "get_admin_dashboard_summary":
                    result = await get_admin_dashboard_summary(auth_header or "")
                elif function_name == "get_dealer_profile_summary":
                    result = await get_dealer_profile_summary(auth_header or "")
                else:
                    result = {"error": f"Unknown function {function_name}"}
                    
                # Append the tool execution result back to the messages array
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result)
                })
                
            # Make a second call to Groq with the newly injected tool context
            response = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.4,
                max_tokens=1024,
                top_p=0.9,
            )
            
        reply: str = response.choices[0].message.content.strip() if response.choices[0].message.content else ""
        logger.debug("Groq reply (%d chars): %s …", len(reply), reply[:80])
        return reply

    except Exception as exc:
        logger.error("Groq API call failed: %s", exc)
        raise
