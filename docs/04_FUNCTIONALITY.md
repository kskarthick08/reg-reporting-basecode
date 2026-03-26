# Functionality

## Product Scope
The platform supports regulatory workflow execution across three personas with governed handoff:
- BA: requirement-to-data mapping and analysis
- DEV: SQL generation, source-data upload, and submission XML preparation
- REVIEWER: XML validation and final quality checks

## Current Implementation Snapshot
- GitHub artifact publishing is implemented with admin-managed repository URL, branch, base path, enable flag, and token.
- BA can run gap analysis, remediate rows, save functional specifications, and publish saved mapping specs to GitHub.
- BA matching now uses structured metadata from the uploaded data model when available, including qualified table or column names, descriptions, source names, and regulatory references.
- DEV can generate SQL, upload/select source CSV data, generate submission XML, link XML to workflow, and publish SQL/XML to GitHub.
- For PSD008 workflows, DEV XML generation now uses the shared contract mapping together with the workflow’s functional specification, source data, and XSD.
- REVIEWER can validate XML with XSD, PSD, source data, functional specification, and data model context, review AI findings, and send work back to DEV.
- Reviewer output is now rendered as a structured review summary with validation status, coverage checks, schema issues, AI findings, and recommended actions instead of only a raw payload preview.
- Reviewer output now auto-refreshes to the latest completed validation run for the open workflow after a background validation job finishes.
- Reviewer rule checks now prefer structured XML-path-aware matching from the approved functional specification or active mapping contract when available, and only fall back to label heuristics when no structured contract exists.
- Reviewer `Work Output` now shows the latest validation run identifier and an inline preview of the linked submission XML so reviewers can inspect the actual generated data without leaving the stage.
- REVIEWER can publish generated XML to GitHub only after the review gate passes.
- Workflow gates, send-back, async jobs, job notifications, and workflow/system logging are implemented.
- Async jobs are stored in PostgreSQL through the `job_queue` table and executed by FastAPI background tasks plus the polling worker.
- Stage transition readiness is split between hard prerequisites and configurable quality gates. For example, BA still requires a saved functional specification even if quality gating is softened.
- The workbench now includes a persistent notification panel in the header so users can review recent workflow, job, and action events without relying only on transient toasts.
- Terminal job notifications are raised both for live status transitions and for newly seen recent completions so BA remediation and other long-running jobs are less likely to finish silently.
- The notification panel is available on persona home as well as inside an open workflow so assignment events are visible before users drill into a stage.
- BA can apply workflow-scoped waivers for genuine unresolved mapping gaps, preserving auditability while allowing handoff when the remaining blockers are acknowledged as source-model gaps.
- Blocked stage transitions use persistent inline warnings in the action panel rather than transient notifications so users can see exactly what prevents the next move.
- DEV stage now follows the same background-job lock pattern as BA, with a visible running state and temporary input lock while SQL or XML generation is in progress.
- DEV now surfaces a persistent `XML package ready` state in the workspace after XML generation completes so handoff readiness is visible without opening the transition panel.
- Filing-specific XML mapping contracts can now be managed as admin-uploaded `mapping_contract` artifacts, and DEV XML generation resolves those contracts by report code before falling back to filesystem prototype assets.

## Current vs Target Alignment

### Already Implemented
- Admin-managed GitHub integration configuration
- BA gap analysis and functional spec persistence
- DEV SQL generation
- DEV XML generation from source data + XSD + PSD
- PSD008 contract-driven XML generation from source data + XSD + functional specification + shared mapping contract
- DEV publish SQL/XML to GitHub
- Reviewer XML validation with AI review output and expanded workflow context
- DEV/Reviewer send-back flow with comments and reason codes
- Meaningful generated artifact naming with workflow context and timestamp
- Job notifications for started/completed background tasks
- Workflow action logging and system audit logging

### Partially Implemented / Needs Alignment
- BA publish flow currently publishes the saved functional spec artifact, not a dedicated raw gap-analysis artifact package.
- Documentation previously described XML generation under Reviewer ownership, but the live implementation places XML generation in DEV.
- Some API documentation omitted async job endpoints and GitHub publishing endpoints.

## Functional Areas

### Artifact Management
- Upload, list, inspect, download, delete, and restore artifacts
- Supported operational kinds include FCA documents, data models, data files, XSD files, and generated outputs
- FCA ingestion also populates retrieval chunks for contextual reasoning and shortlist generation

### BA Analysis
- Gap analysis run generation from FCA + model context
- Gap retrieval and export (`json`, `csv`)
- Gap remediation run for selective row/status corrections
- Remediation uses unresolved status filters, optional supplemental artifacts, and operator guidance in a dedicated studio workflow
- PSD baseline-vs-changed document comparison with summary output
- Context chat over project artifacts
- Functional spec persistence from approved gap runs
- GitHub publishing of saved mapping specification artifacts

### DEV Stage
- SQL generation from approved/selected upstream context
- Source data upload/selection for downstream XML generation
- XML generation from source data + XSD + PSD context
- PSD008 XML generation can switch to the committed contract in `prototype-assets/PSD008 Prototype Pack`
- SQL artifact download
- Link submission XML artifact to workflow before reviewer handoff
- GitHub publishing of generated SQL and linked/generated XML artifacts

### REVIEWER Stage
- XML validation pipeline
- Validation retrieval/report endpoints
- Final XML artifact download
- Gate-controlled GitHub publishing of validated XML artifacts
- Validation context includes XML + XSD + PSD + source data + functional specification + data model
- Reviewer rule-check coverage now prefers approved functional specification rows over raw PSD headings when deriving required-field coverage
- AI-assisted issue summary, compact validation display, and a normalized coverage score that falls back to structured rule coverage when the LLM omits it
- Send-back to DEV with structured reason + comment

### GitHub Integration
- Admin configures one GitHub repository per project
- Supported settings: repository URL, branch, base folder path, enabled flag, token
- Current token expectation: GitHub fine-grained PAT with repository `Contents: Read and write`
- BA, DEV, and Reviewer stage actions can be extended to publish approved artifacts to the configured target

### Workflow Governance
- Workflow creation, listing, and detailed history
- Business-friendly workflow display identifier format: `WF-YYYY-NNNNNN`
- Stage submit and send-back with reason tracking
- Stage exit gate evaluation and quality summary
- Workflow version creation with carry-forward options

### Admin Operations
- Instruction retrieval/version history/update by agent key
- Admin audit log access
- Synthetic data loading endpoints
- Admin workflow list/delete operations
- GitHub integration configuration and token management

## Non-Functional Behavior
- Local no-auth mode by design
- Durable storage of stage outputs in `analysis_runs`
- Artifact traceability across workflow lifecycle
- Explainable stage transitions via `workflow_stage_history`
- Background-job state tracking via `job_queue`
