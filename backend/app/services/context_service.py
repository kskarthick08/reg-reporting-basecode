import re

from sqlalchemy.orm import Session

from app.models import Artifact


def artifact_context_text(
    db: Session,
    project_id: str,
    include_all_artifacts: bool = True,
    artifact_ids: list[int] | None = None,
    max_chars: int = 20000,
) -> str:
    """Build a compact text bundle from recent project artifacts for context-chat prompts."""
    query = db.query(Artifact).filter(Artifact.project_id == project_id, Artifact.is_deleted.is_(False))
    if artifact_ids:
        query = query.filter(Artifact.id.in_(artifact_ids))
    rows = query.order_by(Artifact.id.desc()).limit(20 if include_all_artifacts else 8).all()
    blocks = []
    for a in rows:
        kind = a.kind or ""
        name = a.filename or ""
        txt = (a.extracted_text or "")[:4000]
        jtxt = ""
        if isinstance(a.extracted_json, dict):
            jtxt = str(a.extracted_json)[:2000]
        blocks.append(f"[Artifact #{a.id} | {kind} | {name}]\n{txt}\n{jtxt}\n")
    out = "\n".join(blocks)
    return out[:max_chars]


def extract_requirement_lines(text: str, limit: int = 400) -> list[str]:
    """Extract human-readable requirement-like lines from free-form PSD text."""
    lines = []
    for raw in re.split(r"[\r\n]+", text or ""):
        ln = re.sub(r"\s+", " ", raw).strip()
        if len(ln) < 8:
            continue
        if ln.lower().startswith(("page ", "table ", "figure ")):
            continue
        lines.append(ln)
        if len(lines) >= limit:
            break
    return lines
