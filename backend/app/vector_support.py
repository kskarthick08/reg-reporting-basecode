"""Shared pgvector compatibility helpers used by models and retrieval services."""

from __future__ import annotations

from sqlalchemy import ARRAY, Float

from app.config import settings

try:  # pragma: no cover - import availability depends on runtime environment
    from pgvector.sqlalchemy import Vector

    PGVECTOR_SQLALCHEMY_AVAILABLE = True
except ImportError:  # pragma: no cover
    Vector = None
    PGVECTOR_SQLALCHEMY_AVAILABLE = False


def embedding_column_type(dim: int | None = None):
    """Return the preferred SQLAlchemy type for embedding storage."""
    size = int(dim or settings.embedding_dim or 768)
    if PGVECTOR_SQLALCHEMY_AVAILABLE and Vector is not None:
        return Vector(size)
    return ARRAY(Float)


def supports_vector_distance(column: object) -> bool:
    """Detect whether a mapped column exposes pgvector distance operators."""
    return hasattr(column, "cosine_distance")
