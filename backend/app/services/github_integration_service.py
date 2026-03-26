from __future__ import annotations

from base64 import b64encode
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Artifact, Workflow
from app.models_integration import GitHubIntegrationConfig


@dataclass
class ParsedGitHubRepo:
    repo_url: str
    owner: str
    name: str


def _github_headers(token: str) -> dict[str, str]:
    """Handle github headers within the service layer."""
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _github_error_message(response: httpx.Response) -> str:
    """Handle github error message within the service layer."""
    try:
        payload = response.json()
    except ValueError:
        payload = None
    if isinstance(payload, dict):
        message = str(payload.get("message") or "").strip()
        status = str(payload.get("status") or "").strip()
        if message and status:
            return f"{message} ({status})"
        if message:
            return message
    text = response.text.strip()
    return text[:300] if text else f"GitHub API returned {response.status_code}"


async def _ensure_repo_and_branch_access(
    client: httpx.AsyncClient,
    *,
    cfg: GitHubIntegrationConfig,
    headers: dict[str, str],
) -> None:
    """Ensure repo and branch access within the service layer."""
    repo_slug = f"{cfg.repo_owner}/{cfg.repo_name}"
    repo_url = f"https://api.github.com/repos/{repo_slug}"
    repo_response = await client.get(repo_url, headers=headers)
    if repo_response.status_code == 404:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "github_repo_not_accessible",
                "message": (
                    f"GitHub token cannot access the configured repository {repo_slug}. "
                    "Grant this token access to that repository and retry publishing."
                ),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
            },
        )
    if repo_response.status_code == 403:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "github_repo_permission_denied",
                "message": (
                    f"GitHub token can authenticate but does not have repository access for {repo_slug}. "
                    "Grant this token repository access with metadata read and contents read/write, then retry publishing."
                ),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
            },
        )
    if repo_response.status_code >= 300:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "github_repo_check_failed",
                "message": _github_error_message(repo_response),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
            },
        )

    branch_url = f"{repo_url}/branches/{cfg.branch}"
    branch_response = await client.get(branch_url, headers=headers)
    if branch_response.status_code == 404:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "github_branch_not_found",
                "message": (
                    f"Configured branch {cfg.branch} was not found in {repo_slug}. "
                    "Update the GitHub integration branch and retry publishing."
                ),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
            },
        )
    if branch_response.status_code == 403:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "github_branch_permission_denied",
                "message": (
                    f"GitHub token cannot read branch {cfg.branch} in {repo_slug}. "
                    "Grant this token metadata read and contents read/write access for the configured repository."
                ),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
            },
        )
    if branch_response.status_code >= 300:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "github_branch_check_failed",
                "message": _github_error_message(branch_response),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
            },
        )


def parse_github_repo(repo_url: str) -> ParsedGitHubRepo:
    """Parse github repo within the service layer."""
    text = str(repo_url or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="github_repo_url_required")
    if text.startswith("git@github.com:"):
        path_part = text.split("git@github.com:", 1)[1]
        text = f"https://github.com/{path_part}"
    if "://" not in text:
        text = f"https://{text.lstrip('/')}"
    if text.endswith(".git"):
        text = text[:-4]
    parsed = urlparse(text)
    if parsed.netloc.lower() != "github.com":
        raise HTTPException(status_code=422, detail="github_repo_url_invalid_host")
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        raise HTTPException(status_code=422, detail="github_repo_url_invalid_path")
    return ParsedGitHubRepo(repo_url=f"https://github.com/{parts[0]}/{parts[1]}", owner=parts[0], name=parts[1])


def mask_token(token: str | None) -> str | None:
    """Mask token within the service layer."""
    value = str(token or "").strip()
    if not value:
        return None
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}{'*' * max(len(value) - 8, 4)}{value[-4:]}"


def serialize_github_config(row: GitHubIntegrationConfig | None) -> dict[str, Any]:
    """Serialize github config within the service layer."""
    if not row:
        return {
            "enabled": False,
            "repo_url": "",
            "branch": "main",
            "base_path": "",
            "token_configured": False,
            "token_masked": None,
            "updated_by": None,
            "updated_at": None,
        }
    return {
        "enabled": bool(row.enabled),
        "repo_url": row.repo_url,
        "branch": row.branch,
        "base_path": row.base_path or "",
        "token_configured": bool((row.token or "").strip()),
        "token_masked": mask_token(row.token),
        "updated_by": row.updated_by,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def get_github_config(db: Session, project_id: str) -> GitHubIntegrationConfig | None:
    """Return github config for downstream service use."""
    return (
        db.query(GitHubIntegrationConfig)
        .filter(GitHubIntegrationConfig.project_id == project_id)
        .first()
    )


def upsert_github_config(
    db: Session,
    *,
    project_id: str,
    repo_url: str,
    branch: str,
    base_path: str,
    enabled: bool,
    updated_by: str,
    token: str | None = None,
) -> GitHubIntegrationConfig:
    """Handle upsert github config within the service layer."""
    parsed = parse_github_repo(repo_url)
    row = get_github_config(db, project_id)
    if row is None:
        row = GitHubIntegrationConfig(
            project_id=project_id,
            repo_url=parsed.repo_url,
            repo_owner=parsed.owner,
            repo_name=parsed.name,
        )
    row.repo_url = parsed.repo_url
    row.repo_owner = parsed.owner
    row.repo_name = parsed.name
    row.branch = str(branch or "main").strip() or "main"
    row.base_path = str(base_path or "").strip().strip("/")
    row.enabled = bool(enabled)
    row.updated_by = str(updated_by or "admin").strip() or "admin"
    if token is not None:
        row.token = str(token).strip() or None
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def build_publish_path(
    *,
    workflow: Workflow,
    artifact: Artifact,
    stage: str,
    base_path: str = "",
) -> str:
    """Build publish path within the service layer."""
    dt = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    stage_slug = str(stage or workflow.current_stage or "artifact").strip().lower()
    workflow_slug = f"wf_{workflow.id}_{workflow.name or 'workflow'}"
    workflow_slug = "".join(ch if ch.isalnum() else "_" for ch in workflow_slug).strip("_").lower()
    filename = Path(artifact.filename or f"artifact_{artifact.id}").name
    name_root = Path(filename).stem
    ext = Path(filename).suffix
    safe_root = "".join(ch if ch.isalnum() else "_" for ch in name_root).strip("_").lower() or f"artifact_{artifact.id}"
    published_name = f"{safe_root}_{dt}{ext}"
    parts = [part for part in [base_path.strip("/"), workflow.project_id, workflow_slug, stage_slug] if part]
    parts.append(published_name)
    return "/".join(parts)


async def publish_artifact_to_github(
    db: Session,
    *,
    project_id: str,
    workflow: Workflow,
    artifact: Artifact,
    actor: str,
    stage: str,
    commit_message: str | None = None,
) -> dict[str, Any]:
    """Publish artifact to github within the service layer."""
    cfg = get_github_config(db, project_id)
    if cfg is None or not cfg.enabled:
        raise HTTPException(status_code=422, detail="github_integration_not_enabled")
    token = str(cfg.token or "").strip()
    if not token:
        raise HTTPException(status_code=422, detail="github_token_missing")

    file_path = Path(artifact.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="artifact_file_missing")

    publish_path = build_publish_path(
        workflow=workflow,
        artifact=artifact,
        stage=stage,
        base_path=cfg.base_path or "",
    )
    content_b64 = b64encode(file_path.read_bytes()).decode("ascii")
    url = f"https://api.github.com/repos/{cfg.repo_owner}/{cfg.repo_name}/contents/{publish_path}"
    message = commit_message or f"Publish {artifact.display_name or artifact.filename} from workflow {workflow.id} ({stage})"
    payload = {
        "message": message,
        "content": content_b64,
        "branch": cfg.branch,
        "committer": {"name": actor or "Reg Reporting AI", "email": "noreply@local.demo"},
    }
    headers = _github_headers(token)

    async with httpx.AsyncClient(timeout=30.0) as client:
        await _ensure_repo_and_branch_access(client, cfg=cfg, headers=headers)
        response = await client.put(url, headers=headers, json=payload)
    if response.status_code == 404:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "github_publish_target_not_accessible",
                "message": (
                    f"GitHub token could not create {publish_path} in {cfg.repo_owner}/{cfg.repo_name}. "
                    "Ensure the token has Contents read/write access for the configured repository."
                ),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
                "path": publish_path,
            },
        )
    if response.status_code >= 300:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "github_publish_failed",
                "message": _github_error_message(response),
                "repo_url": cfg.repo_url,
                "branch": cfg.branch,
                "path": publish_path,
            },
        )
    data = response.json()
    content = data.get("content") or {}
    commit = data.get("commit") or {}
    return {
        "ok": True,
        "repo_url": cfg.repo_url,
        "branch": cfg.branch,
        "path": publish_path,
        "html_url": content.get("html_url"),
        "download_url": content.get("download_url"),
        "sha": content.get("sha"),
        "commit_sha": commit.get("sha"),
    }
