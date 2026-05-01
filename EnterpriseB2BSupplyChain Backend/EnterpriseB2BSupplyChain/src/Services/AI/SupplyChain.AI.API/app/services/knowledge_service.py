"""
knowledge_service.py
--------------------
FAISS-backed in-memory vector knowledge base for HUL supply chain policies.

Replaces the previous ChromaDB implementation to avoid the hnswlib C++
build requirement that fails on Windows without a full MSVC toolchain.

Lifecycle:
  - initialise_knowledge_base() is called once at FastAPI startup (lifespan).
  - sentence-transformers/all-MiniLM-L6-v2 encodes the 5 policy strings
    into 384-dimensional float32 vectors.
  - A faiss.IndexFlatL2 (exact L2 nearest-neighbour, no approximation) is
    built in memory. No disk I/O. No C++ extensions beyond the faiss-cpu wheel.
  - A dict maps integer FAISS IDs → original policy text.
  - query_knowledge() embeds the user query, searches the index for top-K
    nearest vectors, and returns the matching policy strings.
"""

import logging
from typing import Optional

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)

# ── Mock HUL supply chain policy corpus ──────────────────────────────────────
POLICY_DOCUMENTS: list[str] = [
    (
        "HUL Standard Return Window Policy: Dealers may initiate a product return "
        "within 30 days of the confirmed delivery date. Items must be in original, "
        "unopened packaging. Perishable goods such as food products are exempt from "
        "this policy and are non-returnable once accepted at delivery."
    ),
    (
        "HUL Shipping & Freight Fee Schedule: For orders below ₹5,000 (net value), "
        "a standard freight surcharge of ₹250 is applied at checkout. Orders valued "
        "at ₹5,000 or above qualify for complimentary shipping. Express or next-day "
        "delivery incurs an additional ₹500 premium regardless of order value."
    ),
    (
        "HUL Minimum Order Quantity (MOQ) Guidelines: Each SKU in the HUL catalogue "
        "has a defined MOQ, typically set at one full case (6–24 units depending on "
        "category). Orders below the MOQ for a given SKU will be automatically "
        "rounded up to the nearest case quantity and the dealer will be notified via "
        "the portal before dispatch."
    ),
    (
        "HUL Credit & Payment Terms for Registered Dealers: Approved Platinum-tier "
        "dealers enjoy a 45-day net credit window. Gold-tier dealers receive a 30-day "
        "net credit window. Silver-tier and new dealers must pay in advance or within "
        "7 days of invoice. Late payments attract a 1.5% monthly finance charge. "
        "Credit limits are reviewed quarterly by the HUL Finance team."
    ),
    (
        "HUL Damaged-Goods & Shortage Claim Process: Dealers must report any "
        "shortages, transit damage, or incorrect products within 48 hours of delivery "
        "by raising a claim ticket in the portal with photographic evidence. Claims "
        "submitted after the 48-hour window will not be eligible for credit notes or "
        "replacements. Approved claims are typically resolved within 7 business days "
        "through credit note issuance or re-shipment."
    ),
    (
        "HUL Order Cancellation Policy: Orders may be cancelled without penalty up to "
        "2 hours after placement, provided they have not yet been picked for dispatch. "
        "Cancellations requested after the 2-hour window or post-dispatch are not "
        "accepted. Dealers should contact their HUL Key Account Manager for urgent "
        "cancellation exceptions, which are handled on a case-by-case basis."
    ),
    (
        "HUL Product Expiry & Batch Management: HUL dispatches products following a "
        "strict FEFO (First Expiry, First Out) rotation. Dealers must report any "
        "products with less than 60% of their total shelf life remaining at delivery. "
        "Such items qualify for an immediate credit note or replacement under the "
        "HUL Freshness Guarantee programme."
    ),
    (
        "HUL Promotional Scheme & Discount Policy: Promotional schemes (volume "
        "discounts, bundle offers, seasonal promotions) are published on the dealer "
        "portal at the start of each month. Discounts are applied automatically at "
        "checkout when eligibility conditions are met. Schemes cannot be applied "
        "retrospectively to already-confirmed orders."
    ),
]

# ── Module-level singletons (initialised on startup) ─────────────────────────
_faiss_index: Optional[faiss.IndexFlatL2] = None
_id_to_document: dict[int, str] = {}
_embedding_model: Optional[SentenceTransformer] = None
_topic_embeddings: Optional[np.ndarray] = None

# ── Semantic Intent Classifier Topics ───────────────────────────────────────
APPROVED_TOPICS: list[str] = [
    "Check my order status",
    "How many delivery agents do we have",
    "What is the shipping fee",
    "Approve a dealer limit",
    "Track a shipment",
    "Return a damaged product",
    "Show me the catalog",
    "Minimum order quantity",
    "Credit and payment terms",
    "Promotional schemes and discounts",
    "Product expiry and freshness",
    "Order cancellation",
    "System status",
    "Contact support"
]


def initialise_knowledge_base() -> None:
    """
    Called once at application startup (FastAPI lifespan).

    Steps:
      1. Load the sentence-transformer model (cached by HuggingFace Hub after
         first download, so subsequent restarts are fast).
      2. Encode all policy strings into float32 numpy vectors.
      3. Build a faiss.IndexFlatL2 index (dimension = embedding size = 384).
      4. Add vectors to the index and populate the id→text lookup dict.
    """
    global _faiss_index, _id_to_document, _embedding_model, _topic_embeddings

    logger.info("Initialising FAISS in-memory knowledge base …")

    # Step 1 — Load embedding model
    logger.info("Loading sentence-transformer model: %s", settings.EMBEDDING_MODEL)
    _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)

    # Step 2 — Encode all policy documents → shape (N, D)
    embeddings: np.ndarray = _embedding_model.encode(
        POLICY_DOCUMENTS,
        convert_to_numpy=True,
        normalize_embeddings=True,   # L2-normalised → cosine sim ≡ L2 for unit vectors
        show_progress_bar=False,
    ).astype("float32")

    dimension: int = embeddings.shape[1]   # 384 for all-MiniLM-L6-v2

    # Step 3 — Create a flat (exact) L2 index — no approximation, no build errors
    _faiss_index = faiss.IndexFlatL2(dimension)

    # Step 4 — Add vectors and populate the lookup dict
    _faiss_index.add(embeddings)
    _id_to_document = {i: doc for i, doc in enumerate(POLICY_DOCUMENTS)}

    logger.info(
        "FAISS knowledge base ready — %d policy vectors indexed (dim=%d).",
        _faiss_index.ntotal,
        dimension,
    )
    
    # Step 5 — Encode approved topics for Semantic Intent Classifier
    _topic_embeddings = _embedding_model.encode(
        APPROVED_TOPICS,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).astype("float32")


def query_knowledge(query_text: str, top_k: int = settings.FAISS_TOP_K) -> list[str]:
    """
    Embed `query_text` and retrieve the top-K most semantically similar
    policy documents from the FAISS index.

    Args:
        query_text: The user's raw message / question.
        top_k:      Number of nearest policy chunks to return.

    Returns:
        List of policy strings ordered by ascending L2 distance (most
        relevant first). Returns [] if the index is not initialised.
    """
    if _faiss_index is None or _embedding_model is None:
        logger.warning("FAISS knowledge base not initialised — returning empty context.")
        return []

    try:
        # Embed the query (1 × D)
        query_vector: np.ndarray = _embedding_model.encode(
            [query_text],
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).astype("float32")

        # Clamp k to the number of indexed documents
        k = min(top_k, _faiss_index.ntotal)

        # Search: distances shape (1, k), indices shape (1, k)
        distances, indices = _faiss_index.search(query_vector, k)

        # Map FAISS integer IDs → original policy strings
        results: list[str] = []
        for idx in indices[0]:
            if idx == -1:           # FAISS returns -1 for unfilled slots
                continue
            doc = _id_to_document.get(int(idx))
            if doc:
                results.append(doc)

        logger.debug(
            "FAISS returned %d chunks for query: '%s…' (distances: %s)",
            len(results),
            query_text[:60],
            distances[0].tolist(),
        )
        return results

    except Exception as exc:
        logger.error("FAISS query failed: %s", exc)
        return []

def is_query_relevant(query_text: str, threshold: float = 0.3) -> bool:
    """
    Check if the user's query is semantically related to the approved supply chain topics.
    
    Args:
        query_text: The user's query.
        threshold: The minimum cosine similarity score required (default 0.3).
        
    Returns:
        bool: True if relevant, False otherwise.
    """
    if _embedding_model is None or _topic_embeddings is None:
        logger.warning("Knowledge base not initialized, bypassing intent classification.")
        return True
        
    try:
        # Embed the query
        query_vector = _embedding_model.encode(
            [query_text],
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).astype("float32")
        
        # Calculate cosine similarity (dot product of L2-normalized vectors)
        similarities = np.dot(_topic_embeddings, query_vector.T).flatten()
        max_sim = float(np.max(similarities))
        
        if max_sim < threshold:
            logger.warning("Query '%s' rejected. Max similarity: %.2f", query_text, max_sim)
            return False
            
        return True
        
    except Exception as exc:
        logger.error("Intent classification failed: %s", exc)
        return True  # Fail open
