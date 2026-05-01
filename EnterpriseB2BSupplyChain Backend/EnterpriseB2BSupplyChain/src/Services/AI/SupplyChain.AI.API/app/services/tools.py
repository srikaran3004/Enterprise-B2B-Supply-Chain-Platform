"""
tools.py
--------
Python API Tools for the Groq LLM to interact with downstream .NET microservices
via the Ocelot API Gateway.
"""

import httpx
import logging

logger = logging.getLogger(__name__)

# Reusable async client pointing to the Ocelot Gateway
GATEWAY_URL = "http://localhost:5000"


async def get_order_status(order_id: str, auth_token: str) -> dict:
    """
    Retrieve the current status and details of a specific order.

    This tool makes an authenticated GET request to the Orders microservice. 
    Use this tool when the user asks about the status of their order or needs
    specific order details like total amount, shipping address, or items.

    Args:
        order_id: The unique identifier (UUID or string) of the order.
        auth_token: The user's Bearer JWT.

    Returns:
        dict: A dictionary containing the order details if successful.
              If the order is not found, returns {"error": f"Order {order_id} not found.", "status": 404}.
              If unauthorized, returns {"error": "Unauthorized to view this order.", "status": 403}.
              For other errors, returns the error message and status code.
    """
    headers = {"Authorization": auth_token} if auth_token else {}
    url = f"{GATEWAY_URL}/api/orders/{order_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return {"error": f"Order {order_id} not found.", "status": 404}
            elif response.status_code in (401, 403):
                return {"error": "Unauthorized to view this order.", "status": response.status_code}
            else:
                return {"error": f"Failed to retrieve order. Server returned {response.status_code}", "status": response.status_code}
    except Exception as exc:
        logger.error("Error calling get_order_status: %s", exc)
        return {"error": f"Internal tool error: {str(exc)}", "status": 500}


async def approve_order(order_id: str, auth_token: str) -> str:
    """
    Approve a pending order.

    This tool makes an authenticated PUT request to the Orders microservice to approve an order.
    Use this tool ONLY when an Admin or SuperAdmin explicitly requests to approve an order.

    Args:
        order_id: The unique identifier (UUID or string) of the order to approve.
        auth_token: The user's Bearer JWT.

    Returns:
        str: A message indicating whether the order was successfully approved or why it failed.
    """
    headers = {"Authorization": auth_token} if auth_token else {}
    url = f"{GATEWAY_URL}/api/orders/{order_id}/approve"
    
    try:
        async with httpx.AsyncClient() as client:
            # Send an empty JSON object as the body
            response = await client.put(url, headers=headers, json={})
            
            if response.status_code in (200, 204):
                return f"Successfully approved order {order_id}."
            elif response.status_code == 404:
                return f"Cannot approve: Order {order_id} not found."
            elif response.status_code in (401, 403):
                return "Cannot approve: You are not authorized to perform this action."
            else:
                return f"Failed to approve order {order_id}. Server returned status {response.status_code}."
    except Exception as exc:
        logger.error("Error calling approve_order: %s", exc)
        return f"Internal tool error: {str(exc)}"


async def get_delivery_agents_count(auth_token: str) -> dict:
    """
    Retrieve the total number of registered delivery agents.

    This tool makes an authenticated GET request to the Identity/Admin microservice to get all delivery agents and returns the count.
    Use this when an Admin asks for agent statistics.

    Args:
        auth_token: The user's Bearer JWT.

    Returns:
        dict: A dictionary containing the total count of delivery agents if successful.
              If unauthorized, returns {"error": "Unauthorized to view agents.", "status": 403}.
              For other errors, returns the error message and status code.
    """
    headers = {"Authorization": auth_token} if auth_token else {}
    url = f"{GATEWAY_URL}/api/admin/agents"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                # Assuming the endpoint returns a list of agents
                agents = response.json()
                count = len(agents) if isinstance(agents, list) else agents.get("count", 0)
                return {"count": count, "status": 200}
            elif response.status_code in (401, 403):
                return {"error": "Unauthorized to view delivery agents.", "status": response.status_code}
            else:
                return {"error": f"Failed to retrieve agents. Server returned {response.status_code}", "status": response.status_code}
    except Exception as exc:
        logger.error("Error calling get_delivery_agents_count: %s", exc)
        return {"error": f"Internal tool error: {str(exc)}", "status": 500}


async def get_admin_dashboard_summary(auth_token: str) -> dict:
    """
    Retrieve a comprehensive summary of all system statistics.
    Use this when an Admin asks ANY question about system statistics, counts, users, or global order statuses.
    """
    headers = {"Authorization": auth_token} if auth_token else {}
    url = f"{GATEWAY_URL}/api/admin/dashboard"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                # Mock it if it doesn't exist yet
                return {
                    "totalAgents": 61,
                    "totalDealers": 8,
                    "orderCounts": {
                        "pending": 3,
                        "approved": 12,
                        "delivered": 6
                    },
                    "totalRevenue": 142743,
                    "pendingReturns": 2,
                    "status": "mocked"
                }
            elif response.status_code in (401, 403):
                return {"error": "Unauthorized to view admin dashboard.", "status": response.status_code}
            else:
                return {"error": f"Failed to retrieve dashboard. Server returned {response.status_code}", "status": response.status_code}
    except Exception as exc:
        logger.error("Error calling get_admin_dashboard_summary: %s", exc)
        return {"error": f"Internal tool error: {str(exc)}", "status": 500}


async def get_dealer_profile_summary(auth_token: str) -> dict:
    """
    Retrieve a comprehensive summary of the logged-in dealer's state.
    Use this when a Dealer asks about their credit limit, outstanding balance, total orders, active shipments, etc.
    """
    headers = {"Authorization": auth_token} if auth_token else {}
    url = f"{GATEWAY_URL}/api/dealers/me/summary"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                # Mock it if it doesn't exist yet
                return {
                    "creditLimit": 500000,
                    "outstandingBalance": 125000,
                    "totalOrders": 24,
                    "activeShipments": 2,
                    "tier": "Gold",
                    "status": "mocked"
                }
            elif response.status_code in (401, 403):
                return {"error": "Unauthorized to view dealer profile.", "status": response.status_code}
            else:
                return {"error": f"Failed to retrieve dealer profile. Server returned {response.status_code}", "status": response.status_code}
    except Exception as exc:
        logger.error("Error calling get_dealer_profile_summary: %s", exc)
        return {"error": f"Internal tool error: {str(exc)}", "status": 500}
