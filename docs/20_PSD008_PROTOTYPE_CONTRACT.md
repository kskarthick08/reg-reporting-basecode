# PSD008 Prototype Contract

## Purpose

This document defines the PSD008 prototype artifact contract for the application.
It complements the committed prototype pack in:

- `prototype-assets/PSD008 Prototype Pack`

The goal is to make the final XML deliverable explicit and traceable across BA, DEV, and REVIEWER stages.

## Authoritative Prototype Inputs and Outputs

### Source Data

- `prototype-assets/PSD008 Prototype Pack/PSD008-Prototype-Source-Data.csv`
- Represents the canonical transaction dataset that DEV should transform into the final XML output.

### Functional Specification

- `prototype-assets/PSD008 Prototype Pack/PSD008-Prototype-Functional-Spec.json`
- `prototype-assets/PSD008 Prototype Pack/PSD008-Prototype-Functional-Spec.csv`
- Defines the approved field-to-output contract that DEV and REVIEWER should rely on.

### XML Mapping Contract

- `prototype-assets/PSD008 Prototype Pack/PSD008-Prototype-Mapping-Config.json`
- Defines how each source field maps to the PSD008 XML structure, including type and transformation expectations.
- This contract can now also be registered in the application as an admin-managed `mapping_contract` artifact so runtime XML generation resolves it from the platform instead of relying only on repository files.

### Final Output

- `prototype-assets/PSD008 Prototype Pack/PSD008-Prototype-Valid.xml`
- This is the schema-aligned prototype target output.

### Negative Validation Artifact

- `prototype-assets/PSD008 Prototype Pack/PSD008-Prototype-Invalid.xml`
- This is intentionally invalid and should fail reviewer/schema validation.

## What This Means for the Application

### BA Stage

BA should not stop at an unstructured mapping summary.
The BA output should become a machine-readable functional specification with:

- business field
- source field or derived rule
- target XML path
- datatype
- code-list or enum constraints
- transformation notes

### DEV Stage

DEV XML generation should not rely on a generic prompt alone.
It should use:

- the approved functional specification
- the source dataset
- a filing-specific XML mapping contract
- the XSD

The preferred implementation path is deterministic rendering with controlled transforms, with LLM support used for reasoning and gap handling rather than raw final-XML free generation.

### REVIEWER Stage

Reviewer validation should check:

- XSD validity
- functional-spec coverage
- source-to-output traceability
- enum and date normalization
- missing required business content

## Current Gaps Against This Contract

### Strong Areas

- BA mapping and persistence are already reasonably well structured.
- SQL generation has meaningful validation and repair logic.
- Reviewer validation already includes broader workflow context than before.

### Weak Areas

- PSD008 XML generation is not yet driven by a filing-specific mapping contract.
- The current PSD008-specific XML builder does not reflect the full target output structure defined by this prototype pack.
- Functional specification is not yet a first-class mandatory input to DEV XML generation.
- Reviewer rule checks are still tag-oriented and not fully semantic or field-traceable.

## Recommendation

Use this prototype pack as the acceptance contract for the next XML-generation hardening phase.

That phase should:

1. Load the mapping config.
2. Normalize source values.
3. Render XML deterministically.
4. Validate against XSD.
5. Compare output coverage to the functional specification.
6. Present reviewer findings with record-level traceability.

## Current Live Usage

The live PSD008 XML generation path now uses this shared contract as the filing-specific reference layer on top of workflow inputs.
BA still works from uploaded PSD and selected data model, and DEV still works from workflow artifacts. The committed prototype pack acts as the shared rendering contract and quality benchmark behind that live workflow.
