"""Delete Elasticsearch vector documents by metadata fields."""

from app.services.vectorstore import get_vectorstore


def delete_embeddings_for_document_ids(document_ids: list[str]) -> int:
    if not document_ids:
        return 0
    return get_vectorstore().delete_by_metadata_values("document_id", document_ids)


def delete_embeddings_for_course_id(course_id: str) -> int:
    return get_vectorstore().delete_by_metadata_values("course_id", [course_id])
