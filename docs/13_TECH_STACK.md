# Tech Stack

## Frontend
- Next.js + React
- TypeScript
- shared global CSS layers under `frontend/app/styles/`

## Backend
- FastAPI + Uvicorn
- SQLAlchemy
- Pydantic / pydantic-settings
- httpx
- pandas / openpyxl
- xmlschema

## Data and Infrastructure
- PostgreSQL (`pgvector` enabled image, job metadata, workflow state, artifact metadata, rag chunk embeddings)
- local filesystem artifact store under `data/artifacts`
- Podman Compose

## AI Integration
- OpenAI-compatible chat completion gateway
- Persona-specific prompt flows (BA, DEV, REVIEWER, context chat)
- Deterministic validation and workflow gate checks around AI output
- Text chunking for FCA uploads, deterministic embedding persistence, and pgvector-backed shortlist retrieval with lexical fallback
