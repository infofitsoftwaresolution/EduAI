"""
Lightweight schema patches for existing databases.

SQLAlchemy create_all() does not add new columns to tables that already exist.
This module applies idempotent ALTERs on startup (safe to run every time).
"""

from sqlalchemy import text

from app.db.session import engine

_UPGRADES: tuple[str, ...] = (
    """
    ALTER TABLE knowledge_assets
      ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ready'
    """,
    """
    ALTER TABLE knowledge_assets
      ADD COLUMN IF NOT EXISTS error_message TEXT
    """,
)


def ensure_schema() -> None:
    with engine.begin() as conn:
        for stmt in _UPGRADES:
            conn.execute(text(stmt))
