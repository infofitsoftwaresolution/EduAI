"""Delete LangChain PGVector rows by metadata.document_id (same DB as LMS tables)."""

from sqlalchemy import bindparam, text

from app.db.session import engine
from app.services.vectorstore import COLLECTION_NAME


def delete_embeddings_for_document_ids(document_ids: list[str]) -> int:
    if not document_ids:
        return 0
    ids = [str(i) for i in document_ids]
    stmt = (
        text(
            """
            DELETE FROM langchain_pg_embedding AS e
            USING langchain_pg_collection AS c
            WHERE e.collection_id = c.uuid
              AND c.name = :cname
              AND e.cmetadata->>'document_id' IN :ids
            """
        )
        .bindparams(bindparam("ids", expanding=True))
    )
    with engine.begin() as conn:
        result = conn.execute(stmt, {"cname": COLLECTION_NAME, "ids": ids})
        return result.rowcount or 0


def delete_embeddings_for_course_id(course_id: str) -> int:
    stmt = text(
        """
        DELETE FROM langchain_pg_embedding AS e
        USING langchain_pg_collection AS c
        WHERE e.collection_id = c.uuid
          AND c.name = :cname
          AND e.cmetadata->>'course_id' = :course_id
        """
    )
    with engine.begin() as conn:
        result = conn.execute(stmt, {"cname": COLLECTION_NAME, "course_id": course_id})
        return result.rowcount or 0
