from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import RagChunk
from app.services.vector_service import embedding_for_text, search_rag_chunks

router = APIRouter()


class RagChunkIn(BaseModel):
    source_ref: str = Field(..., max_length=255)
    text: str = Field(..., min_length=1)
    metadata: dict | None = None
    embedding: list[float] | None = None


class RagIngestRequest(BaseModel):
    project_id: str = Field(..., max_length=100)
    chunks: list[RagChunkIn]


@router.post("/v1/rag/ingest")
def rag_ingest(req: RagIngestRequest, db: Session = Depends(get_db)):
    """Handle the RAG ingest API request."""
    if not req.chunks:
        raise HTTPException(status_code=400, detail="chunks cannot be empty")
    rows = []
    for c in req.chunks:
        if c.embedding is not None and len(c.embedding) == 0:
            raise HTTPException(status_code=400, detail=f"invalid embedding for source_ref={c.source_ref}")
        row = RagChunk(
            project_id=req.project_id,
            source_ref=c.source_ref,
            chunk_text=c.text,
            chunk_metadata=c.metadata or {},
            embedding=c.embedding or embedding_for_text(c.text),
        )
        db.add(row)
        rows.append(row)
    db.commit()
    return {"ok": True, "inserted": len(rows)}


class RagSearchRequest(BaseModel):
    project_id: str = Field(..., max_length=100)
    query: str = Field(..., min_length=1)
    limit: int = Field(5, ge=1, le=30)


@router.post("/v1/rag/search")
def rag_search(req: RagSearchRequest, db: Session = Depends(get_db)):
    """Handle the RAG search API request."""
    q = req.query.lower().strip()
    if not q:
        raise HTTPException(status_code=400, detail="query cannot be empty")
    items = search_rag_chunks(db, project_id=req.project_id, query_text=req.query, limit=req.limit)
    return {"ok": True, "project_id": req.project_id, "query": req.query, "items": items}
