# API Endpoints

Base URL: `http://localhost:<API_PORT>`

## System
- `GET /health`
- `GET /ready`
- `GET /v1/llm/health`
- `POST /v1/llm/chat`

`GET /health` and `GET /ready` return startup state plus dependency checks for database and the configured LLM endpoint.

## Artifacts
- `POST /v1/files/upload`
- `GET /v1/artifacts`
- `GET /v1/artifacts/{artifact_id}`
- `GET /v1/artifacts/{artifact_id}/download`
- `DELETE /v1/artifacts/{artifact_id}`
- `POST /v1/admin/artifacts/{artifact_id}/restore`
- `GET /v1/admin/artifacts`

## BA Domain
- `POST /v1/gap-analysis/run`
- `POST /v1/gap-analysis/run-async`
- `POST /ba/gap-analysis/async`
- `POST /v1/gap-analysis/remediate`
- `POST /v1/gap-analysis/remediate-async`
- `POST /ba/gap-analysis/remediate/async`
  Alias used by the BA workbench for background remediation jobs.
- `GET /v1/gap-analysis/{run_id}`
- `PATCH /v1/gap-analysis/{run_id}/update-row`
- `GET /v1/gap-analysis/{run_id}/export`
- `POST /v1/psd/compare`
- `POST /v1/chat/context`

## DEV Domain
- `POST /v1/sql/generate`
- `POST /v1/sql/generate-async`
- `GET /v1/sql/{run_id}/download`
- `POST /v1/dev/report-xml/generate`
- `POST /v1/dev/report-xml/generate-async`
- `POST /v1/dev/report-xml/link`

## REVIEWER Domain
- `POST /v1/xml/generate`
- `POST /v1/xml/generate-async`
- `POST /v1/xml/validate`
- `POST /v1/xml/validate-async`
- `GET /v1/xml/validation/{run_id}`
- `GET /v1/xml/validation/{run_id}/report`
- `GET /v1/xml/{run_id}/download`

## RAG
- `POST /v1/rag/ingest`
- `POST /v1/rag/search`

## Workflows
- `POST /v1/workflows`
- `POST /v1/workflows/{workflow_id}/create-version`
- `GET /v1/workflows`
- `GET /v1/workflows/{workflow_id}`
- `GET /v1/workflows/{workflow_id}/quality-summary`
- `POST /v1/workflows/{workflow_id}/submit`
- `POST /v1/workflows/{workflow_id}/send-back`
- `POST /v1/workflows/{workflow_id}/functional-spec`
- `GET /v1/workflows/{workflow_id}/functional-spec/download`

## Admin
- `GET /v1/admin/instructions`
- `GET /v1/admin/instructions/{agent_key}/history`
- `PUT /v1/admin/instructions/{agent_key}`
- `GET /v1/admin/audit-logs`
- `POST /v1/admin/synthetic/load`
- `GET /v1/admin/workflows`
- `DELETE /v1/admin/workflows/{workflow_id}`
- `GET /v1/admin/integrations/github`
- `PUT /v1/admin/integrations/github`

## Integrations
- `POST /v1/integrations/github/publish`

## External LLM Gateway Contract
The backend expects an OpenAI-compatible chat completion endpoint (configured via `AXET_LLM_URL`) and uses model routing via `AXET_LLM_MODEL` plus optional request-time overrides.
