# User Guide

## Access
- Open `http://localhost:3000`.
- Select persona (`BA`, `DEV`, `REVIEWER`).
- Confirm project scope (`project_id`).

## Workflow Home
Use Workflow Home to:
- view queue and pending ownership
- filter by stage, status, and PSD version
- create new workflows (BA)
- create workflow versions (BA)
- track workflows using the display ID format `WF-YYYY-NNNNNN`
- review persistent notifications from the header notification panel
- see assignment notifications on the persona home screen before opening a workflow

## BA Stage
- Upload FCA and select the project data model artifact.
- For first-time setup, Admin must upload the shared data model artifact before BA starts work on the workflow.
- Run gap analysis.
- Apply remediation if needed. The remediation studio lets BA target `Missing` or `Partial Match` rows, include supporting artifacts, and add focused operator guidance.
- Save regulatory mapping specification (JSON/CSV).
- The saved functional specification is a hard submission prerequisite. Quality warnings may still be configurable separately by Admin.
- If the remaining BA blockers are genuine source-model gaps, BA can apply workflow-scoped waivers so the handoff is explicit and auditable.
- Publish the saved specification artifact to GitHub when required.
- Submit to DEV when gate criteria are met.
- If a stage transition is blocked, use the inline warning in the action panel as the source of truth for what must be fixed next.

## DEV Stage
- Use workflow context and latest BA outputs.
- Work through the DEV screen in three compact steps: approved inputs, SQL generation, and XML package preparation.
- The DEV screen is progressive: later steps unlock after earlier ones are completed, while completed steps remain visible as compact context.
- When a DEV SQL or XML job is queued or running, the DEV workspace shows a running indicator and temporarily locks inputs and actions for that workflow.
- Run SQL generation.
- Upload/select source CSV data.
- Generate submission XML from source data + XSD + PSD context.
- After XML generation completes, the DEV workspace shows an explicit `XML package ready` state with the linked XML artifact so the reviewer handoff is visible without opening stage transition controls.
- For contract-aware filings such as PSD008, the XML generator uses the workflow's approved functional specification plus the latest admin-managed `mapping_contract` artifact for that report code.
- Upload or select submission XML artifact and link it.
- Publish SQL and submission XML to GitHub when required.
- Submit to REVIEWER.

## REVIEWER Stage
- Work through the reviewer flow progressively: confirm validation inputs, set review guidance, then run validation.
- Validate XML with XSD, PSD, source data, functional specification, and workflow context inputs.
- Review validation output through the structured reviewer summary in `Work Output`, including overall status, coverage, missing fields, schema errors, AI findings, and recommended actions.
- After a reviewer validation job completes, the `Work Output` panel refreshes to the latest completed validation run automatically.
- Reviewer coverage in the summary and closeout gate falls back to structured rule coverage if the AI response does not return an explicit coverage score.
- When a filing has an active mapping contract, reviewer coverage checks use that structured XML path contract rather than relying only on free-text field labels.
- The reviewer panel also shows the latest validation run number and an inline preview of the linked submission XML so the reviewer can inspect the actual generated data in the same workspace.
- Publish generated XML only after the review gate passes.
- Send back to DEV if issues remain.
- Submit to complete or send back for rework.

## GitHub Publishing
- Configure repository URL, branch, base path, and token from Admin.
- Token type: GitHub fine-grained PAT with repository `Contents: Read and write`.
- Current publish actions are available from BA, DEV, and REVIEWER stage controls, with REVIEWER publishing gated by review quality rules.

## Send-Back
- Available from DEV and REVIEWER stages.
- Requires structured reason code and detailed comment.
- Preserves transition history in workflow audit trail.

## Downloads
- Artifacts: `/v1/artifacts/{id}/download`
- Functional spec: `/v1/workflows/{id}/functional-spec/download?format=json|csv`
- SQL: `/v1/sql/{run_id}/download`
- XML: `/v1/xml/{run_id}/download`
