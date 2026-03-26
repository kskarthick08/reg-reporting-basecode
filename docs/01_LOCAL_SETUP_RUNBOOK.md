# Local Setup Runbook

## Purpose
Run the local stack for development and testing: frontend, backend API, worker, and Postgres (`pgvector` capable image).

## Runtime Assumptions
- Podman or Docker with compose support (and daemon/machine running)
- Node.js 18+ and npm 9+
- Free ports for frontend (`3000`), Postgres (`5432`), and API host port (`API_PORT` from `.env`)

## Standard Local Boot
```powershell
Copy-Item .env.example .env
.\start-local.ps1
```

What the script does:
- starts `postgres`
- creates the target local database if it is missing in the compose Postgres container
- starts `api`, `worker`, and `frontend`
- waits for API and frontend readiness before reporting success

Verify readiness:
```powershell
curl.exe -sS http://localhost:<API_PORT>/ready
```

## Developer Split Mode
Use this when you want frontend hot reload instead of the containerized frontend:
```powershell
Copy-Item .env.example .env
docker compose -f compose.yaml up -d postgres api worker
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open:
- Frontend: `http://localhost:3000`
- API readiness: `http://localhost:<API_PORT>/ready`

## Required Environment Values
- `DATABASE_URL` for backend persistence
- `AXET_LLM_URL` for the LLM gateway
- `AXET_LLM_MODEL` for default model routing
- `NEXT_PUBLIC_API_BASE` in `frontend/.env.local` pointing to `http://localhost:<API_PORT>`

## Operational Commands
```powershell
.\start-local.ps1
.\stop-local.ps1
docker compose -f compose.yaml down
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=200
docker compose -f compose.yaml logs api --tail=200
docker compose -f compose.yaml logs frontend --tail=200
```

## Notes for Daily Development
- `start-local.ps1` is the shared one-command path for a full local stack.
- Frontend can still run separately with `npm run dev` when you want hot reload during development.
- Keep `API_PORT` and `NEXT_PUBLIC_API_BASE` aligned if you use split mode.

## Typical Failure Points
- Port collisions: change `.env` values and restart compose.
- LLM connectivity failures: verify `AXET_LLM_URL`, network access, and SSL settings.
- Missing data in workflow steps: confirm the required artifact types were uploaded to the same `project_id`.
- For step-by-step recovery, use [19 Startup Troubleshooting](./19_STARTUP_TROUBLESHOOTING.md).
