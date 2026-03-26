# PSD008 Prototype Pack

This pack defines a polished PSD008 prototype contract for the application.

It is stored in a normal repo location so the team can version it and use it as a shared reference while building the workflow.

It is intended to provide:
- a schema-aligned target XML artifact
- a deliberately invalid comparison XML artifact
- a realistic source dataset for DEV XML generation
- a machine-readable functional specification snapshot
- a mapping configuration that can drive deterministic XML rendering

## Files

- `PSD008-Prototype-Source-Data.csv`
  Canonical source dataset for the prototype flow.
- `PSD008-Prototype-Functional-Spec.json`
  Functional specification snapshot in machine-readable form.
- `PSD008-Prototype-Functional-Spec.csv`
  Functional specification snapshot in analyst-friendly tabular form.
- `PSD008-Prototype-Mapping-Config.json`
  Filing-specific XML mapping contract for PSD008.
- `PSD008-Prototype-Valid.xml`
  Schema-valid target output for the source dataset.
- `PSD008-Prototype-Invalid.xml`
  Intentionally invalid comparison artifact for reviewer and validation exercises.

## Intended Workflow Usage

1. BA uses the PSD document and logical data model to produce the functional specification.
2. DEV uses the functional specification plus source data to prepare SQL and generate XML.
3. REVIEWER validates the generated XML against the schema, functional specification, and source data.

## Contract Notes

- The XML target in this pack is the authoritative prototype output shape.
- The mapping config is the recommended contract for deterministic XML generation.
- The source CSV is aligned to the XML and functional spec so the same business record can be traced end to end.
- The invalid XML should be used to confirm schema and rule checks are surfacing meaningful issues.

## Important

The older analysis-only samples in `Data for analysis -not for github push` remain useful as working references.
They are not the acceptance artifacts for this prototype pack.
