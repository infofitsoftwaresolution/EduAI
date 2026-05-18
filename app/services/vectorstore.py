import uuid
from typing import Any

from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from langchain_core.documents import Document

from app.config import ELASTICSEARCH_INDEX_NAME, ELASTICSEARCH_URL, EMBEDDING_DIMENSIONS
from app.services.embedder import get_embedder

COLLECTION_NAME = ELASTICSEARCH_INDEX_NAME.lower()


class ElasticsearchVectorStore:
    """Small adapter used by the routes for indexing and retrieval."""

    def __init__(self) -> None:
        self.index_name = COLLECTION_NAME
        self.client = Elasticsearch(ELASTICSEARCH_URL)
        self.embedder = get_embedder()
        self._ensure_index()

    def _ensure_index(self) -> None:
        if self.client.indices.exists(index=self.index_name):
            return

        self.client.indices.create(
            index=self.index_name,
            body={
                "settings": {
                    "index": {
                        "number_of_shards": 1,
                        "number_of_replicas": 0,
                    }
                },
                "mappings": {
                    "properties": {
                        "text": {"type": "text"},
                        "embedding": {
                            "type": "dense_vector",
                            "dims": EMBEDDING_DIMENSIONS,
                            "index": True,
                            "similarity": "cosine",
                        },
                        "metadata": {"type": "object", "enabled": True},
                        "course_id": {"type": "keyword"},
                        "section_id": {"type": "keyword"},
                        "document_id": {"type": "keyword"},
                        "source_type": {"type": "keyword"},
                        "label": {"type": "keyword"},
                    }
                },
            },
        )

    def add_documents(self, documents: list[Document]) -> list[str]:
        if not documents:
            return []

        texts = [doc.page_content for doc in documents]
        vectors = self.embedder.embed_documents(texts)
        ids = [str(uuid.uuid4()) for _ in documents]

        actions = []
        for doc_id, doc, vector in zip(ids, documents, vectors, strict=True):
            metadata = dict(doc.metadata or {})
            actions.append(
                {
                    "_op_type": "index",
                    "_index": self.index_name,
                    "_id": doc_id,
                    "_source": {
                        "text": doc.page_content,
                        "embedding": vector,
                        "metadata": metadata,
                        "course_id": metadata.get("course_id"),
                        "section_id": metadata.get("section_id"),
                        "document_id": metadata.get("document_id"),
                        "source_type": metadata.get("source_type"),
                        "label": metadata.get("label"),
                    },
                }
            )

        bulk(self.client, actions)
        self.client.indices.refresh(index=self.index_name)
        return ids

    def as_retriever(self, search_type: str = "similarity", search_kwargs: dict[str, Any] | None = None):
        return ElasticsearchRetriever(
            vectorstore=self,
            search_type=search_type,
            search_kwargs=search_kwargs or {},
        )

    def similarity_search(
        self,
        query: str,
        *,
        k: int = 4,
        filter: dict[str, str] | None = None,
    ) -> list[Document]:
        query_vector = self.embedder.embed_query(query)
        body = {
            "size": k,
            "_source": {"excludes": ["embedding"]},
            "query": {
                "script_score": {
                    "query": self._metadata_filter_query(filter),
                    "script": {
                        "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                        "params": {"query_vector": query_vector},
                    },
                }
            },
        }
        result = self.client.search(index=self.index_name, body=body)
        return [
            Document(
                page_content=hit["_source"]["text"],
                metadata=hit["_source"].get("metadata") or {},
            )
            for hit in result["hits"]["hits"]
        ]

    def delete_by_metadata_values(self, field: str, values: list[str]) -> int:
        cleaned = [str(value) for value in values if str(value)]
        if not cleaned:
            return 0

        result = self.client.delete_by_query(
            index=self.index_name,
            body={"query": {"terms": {field: cleaned}}},
            conflicts="proceed",
            refresh=True,
        )
        return int(result.get("deleted", 0))

    @staticmethod
    def _metadata_filter_query(filter: dict[str, str] | None) -> dict[str, Any]:
        if not filter:
            return {"match_all": {}}

        return {
            "bool": {
                "filter": [
                    {"term": {field: str(value)}}
                    for field, value in filter.items()
                    if str(value)
                ]
            }
        }


class ElasticsearchRetriever:
    def __init__(
        self,
        *,
        vectorstore: ElasticsearchVectorStore,
        search_type: str,
        search_kwargs: dict[str, Any],
    ) -> None:
        self.vectorstore = vectorstore
        self.search_type = search_type
        self.search_kwargs = search_kwargs

    def invoke(self, query: str) -> list[Document]:
        # The route may ask for "mmr"; this adapter currently performs cosine similarity.
        return self.vectorstore.similarity_search(
            query,
            k=int(self.search_kwargs.get("k", 4)),
            filter=self.search_kwargs.get("filter"),
        )


def get_vectorstore():
    return ElasticsearchVectorStore()