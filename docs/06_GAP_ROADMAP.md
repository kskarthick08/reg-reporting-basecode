# Delivery Roadmap

## Objective
Move from local POC reliability to production-ready workflow governance without changing the core persona model.

## Current Baseline
- End-to-end local workflow is operational.
- Workflow lifecycle, stage gates, and send-back paths are implemented.
- Functional spec persistence and workflow versioning are available.
- Context chat, PSD comparison, SQL generation, XML generation, XML validation, and GitHub publishing are integrated.

## Current Alignment Gaps
- Rework reviewer validation inputs to include functional spec + source CSV/data artifact, not only PSD + data model.
- Decide whether BA publish should mean publishing the saved functional spec only or also a dedicated gap-analysis export artifact.
- Validate end-to-end UI synchronization after recent workbench updates, especially background-job completion and workflow reopen flows.

## Priority Outcomes

### P0: Workflow Reliability
- Harden stage gate metrics and edge-case handling
- Improve failed-run diagnostics surfaced to users
- Ensure deterministic fallback behavior where LLM output is incomplete
- Reconfirm BA -> DEV -> REVIEWER handoff behavior after latest UI/workflow changes

### P1: Traceability and Control
- Expand auditability from stage actions down to field-level decisions
- Improve cross-version reuse of prior approved mapping outputs
- Add stronger policy controls for instruction updates and model overrides
- Complete prototype-ready artifact publishing experience across BA/DEV/REVIEWER personas

### P2: Scale and Operability
- Introduce asynchronous execution for heavy workloads
- Add run monitoring dashboards and richer operational telemetry
- Prepare auth/RBAC integration path for multi-user deployments

## Delivery Guardrails
- Preserve existing API contracts where possible
- Keep workflows explainable and replayable
- Prioritize correctness and traceability over cosmetic speedups
