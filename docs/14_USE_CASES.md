# Use Cases

## Primary Use Case: Governed Regulatory Workflow
A team progresses reporting work through a controlled lifecycle:
- BA maps requirements to data and produces a functional specification.
- DEV generates implementation SQL, prepares submission XML, and links/publishes delivery artifacts.
- REVIEWER validates XML output and quality gates before completion or sends the work back.

Detailed function-call flow for each use case lives in [21 Developer Flow Reference](./21_DEVELOPER_FLOW_REFERENCE.md).

## BA Persona
- Select FCA and data model context.
- Run gap analysis and optional remediation.
- Compare PSD versions when needed.
- Finalize regulatory mapping specification (JSON/CSV).
- Optionally publish the approved mapping specification to GitHub.
- Submit workflow to DEV.

## DEV Persona
- Consume functional spec and current workflow context.
- Generate SQL and review output quality.
- Upload/select source CSV data.
- Generate submission XML using source data + XSD + PSD context.
- Link submission XML artifact for reviewer handoff.
- Publish SQL and submission XML to GitHub when needed.
- Submit workflow to REVIEWER.
- Send back to BA if the upstream mapping is not fit for delivery.

## REVIEWER Persona
- Validate XML output with XSD, PSD, source data, functional specification, and workflow context.
- Review validation findings, rule checks, and AI commentary.
- Complete workflow or send back with a structured reason.

## Admin Persona
- Manage instruction versions and audit trail.
- Load synthetic datasets for testing.
- Manage artifacts and workflow administration.
- Configure GitHub publishing repository settings and token.

## Versioned Change Use Case
- Spawn workflow versions from prior runs.
- Optionally carry forward latest gap run/spec.
- Optionally focus on unresolved-only contexts for incremental change cycles.
