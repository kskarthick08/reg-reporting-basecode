# Startup Troubleshooting

## Recommended Entry Points
- Start everything locally with `.\start-local.ps1`
- Stop the local stack with `.\stop-local.ps1`
- Check API readiness with `http://localhost:8000/ready`

## If Startup Stops Early
1. Run `docker compose -f compose.yaml ps` (or the same with `podman compose`).
2. Confirm `fca-postgres`, `fca-api`, `fca-worker`, and `fca-frontend` are running or healthy.
3. Open `http://localhost:8000/ready` and inspect the dependency payload.

## Common Failure Cases

### Database Connection Failed
Symptoms:
- API container does not become healthy
- `/ready` reports database failure

Actions:
1. Verify `DATABASE_URL` in `.env`
2. Confirm the Postgres container is healthy
3. If using AWS, verify the RDS endpoint, security group, and target database name

### pgvector Is Missing
Symptoms:
- `/ready` reports degraded mode
- startup logs show `pgvector` warning details

Actions:
1. Confirm the database allows `CREATE EXTENSION vector`
2. If using RDS, enable pgvector on the target instance
3. Re-check `/ready` after extension setup

### LLM Endpoint Failed
Symptoms:
- UI shows degraded backend status
- `/ready` reports `llm.ok=false`

Actions:
1. Verify `AXET_LLM_URL`
2. Confirm network access from the host or container
3. Check TLS behavior with `AXET_LLM_VERIFY_SSL`

### Frontend Did Not Start
Symptoms:
- `http://localhost:3000` does not load
- compose shows `fca-frontend` restarting or unhealthy

Actions:
1. Review `docker compose -f compose.yaml logs frontend --tail=200`
2. Confirm the API is healthy first
3. Rebuild with `docker compose -f compose.yaml up -d --build frontend`

## Useful Commands
```powershell
.\start-local.ps1
.\stop-local.ps1
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=200
docker compose -f compose.yaml logs api --tail=200
docker compose -f compose.yaml logs frontend --tail=200
curl.exe -sS http://localhost:8000/ready
```
