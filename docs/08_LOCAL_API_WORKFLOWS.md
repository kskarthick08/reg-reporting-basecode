# Local API Workflows

Base URL: `http://localhost:<API_PORT>`

## End-to-End Artifact to Workflow Path
1. Upload required artifacts with `POST /v1/files/upload`.
2. Create a workflow with `POST /v1/workflows`.
3. Run BA analysis with `POST /v1/gap-analysis/run`.
4. Save functional spec with `POST /v1/workflows/{id}/functional-spec`.
5. Submit BA stage with `POST /v1/workflows/{id}/submit`.
6. Generate SQL in DEV with `POST /v1/sql/generate`.
7. Link submission XML for DEV handoff with `POST /v1/dev/report-xml/link`.
8. Submit DEV stage.
9. Generate/validate XML in REVIEWER with `POST /v1/xml/generate` or `POST /v1/xml/validate`.
10. Submit REVIEWER stage to complete workflow.

## Workflow Control Pattern
- Use `GET /v1/workflows?project_id=...&persona=...` for queue views.
- Use `GET /v1/workflows/{id}/quality-summary` before submit actions.
- Use `POST /v1/workflows/{id}/send-back` for controlled rework loops.

## Operational Notes
- Keep all calls within the same `project_id` for coherent artifact lookup.
- Persist and reuse run IDs (`gap_run_id`, `sql_run_id`, `xml_run_id`) across stages.
- Export BA outputs through `/v1/gap-analysis/{run_id}/export?format=json|csv` when needed outside the platform.

