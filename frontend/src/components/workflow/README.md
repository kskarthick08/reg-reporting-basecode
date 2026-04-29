# Workflow Components

## Overview

This directory contains workflow execution components for the Barclays MCP System. The components are organized by workflow type for better maintainability and code organization.

## Current Structure

```
workflow/
├── WorkflowExecutionOverlay.tsx    # Main overlay component (5,181 lines - needs refactoring)
├── WorkflowDetails.tsx              # Workflow details display
├── WorkflowCanvas.tsx               # ReactFlow visualization
├── workflowTypes.ts                 # ✅ Shared TypeScript interfaces
└── workflowUtils.ts                 # ✅ Shared utility functions
```

## Planned Structure (After Refactoring)

```
workflow/
├── WorkflowExecutionOverlay.tsx    # Router component (~150 lines)
├── WorkflowDetails.tsx              # Workflow details display
├── WorkflowCanvas.tsx               # ReactFlow visualization
├── workflowTypes.ts                 # Shared TypeScript interfaces
├── workflowUtils.ts                 # Shared utility functions
├── ba/                              # Business Analyst workflow
│   ├── BAWorkflowOverlay.tsx
│   ├── BAStepConfigurations.ts
│   ├── BAStepHandlers.ts
│   └── BAResultsDisplay.tsx
├── developer/                       # Developer workflow
│   ├── DeveloperWorkflowOverlay.tsx
│   ├── DeveloperStepConfigurations.ts
│   ├── DeveloperStepHandlers.ts
│   └── DeveloperResultsDisplay.tsx
├── analyst/                         # Analyst/Reviewer workflow
│   ├── AnalystWorkflowOverlay.tsx
│   ├── AnalystStepConfigurations.ts
│   ├── AnalystStepHandlers.ts
│   └── AnalystResultsDisplay.tsx
└── shared/                          # Shared UI components
    ├── WorkflowHeader.tsx
    ├── StepProgressBar.tsx
    ├── StepNavigation.tsx
    ├── ResultsPanel.tsx
    └── SubmitWorkflowDialog.tsx
```

## Shared Types (`workflowTypes.ts`)

Common interfaces used across all workflow components:

- `StepField` - Configuration for step input fields
- `StepConfiguration` - Complete step configuration
- `StepResult` - Step execution result
- `WorkflowStep` - Workflow step definition
- `FormState` - Form state management
- `WorkflowExecutionProps` - Component props
- `StepConfigMap` - Map of step configurations

## Shared Utilities (`workflowUtils.ts`)

Common utility functions:

- `convertDatetimeToJson()` - Convert dates to JSON-serializable format
- `getApiBaseUrl()` - Get API base URL from environment
- `getAuthHeaders()` - Get authorization headers
- `exportResultAsJson()` - Export results as JSON file
- `exportResultAsMarkdown()` - Export results as Markdown file
- `validateRequiredFields()` - Validate form fields
- `loadStepResultsFromHistory()` - Load previous step results
- `getWorkflowTypeDisplay()` - Format workflow type for display
- `formatWorkflowTypeForApi()` - Format workflow type for API calls

## Usage

### Current Usage

```typescript
import { WorkflowExecutionOverlay } from '@/components/workflow/WorkflowExecutionOverlay';

<WorkflowExecutionOverlay
  workflow={workflow}
  isOpen={isOpen}
  onClose={handleClose}
  onWorkflowUpdate={handleUpdate}
/>
```

### Future Usage (After Refactoring)

The usage will remain the same - the router component will automatically delegate to the appropriate workflow-specific component based on `workflow.workflow_type`.

## Workflow Types

The system supports the following workflow types:

1. **Business Analyst** (`business_analyst`)
   - Document Parser
   - Regulatory Diff
   - Dictionary Mapping
   - Gap Analysis
   - Requirement Structuring
   - Assign to Developer

2. **Developer** (`developer`)
   - Schema Analyzer
   - SQL Generator
   - Python ETL Generator
   - Lineage Builder
   - Deterministic Mapping
   - Test Integration

3. **Analyst/Reviewer** (`analyst` / `reviewer`)
   - Validation
   - Anomaly Detection
   - Variance Explanation
   - Cross Report Reconciliation
   - Audit Pack Generator
   - PSD CSV Generator

4. **Complete** (`complete`)
   - Full pipeline with all workflow types

## Refactoring Status

- ✅ **Phase 1 Complete:** Shared types and utilities created
- ⏳ **Phase 2 Pending:** Extract shared components
- ⏳ **Phase 3 Pending:** Create BA workflow component
- ⏳ **Phase 4 Pending:** Create Developer workflow component
- ⏳ **Phase 5 Pending:** Create Analyst workflow component
- ⏳ **Phase 6 Pending:** Update router component
- ⏳ **Phase 7 Pending:** Testing and cleanup

See [WORKFLOW_OVERLAY_REFACTORING_PLAN.md](../../../WORKFLOW_OVERLAY_REFACTORING_PLAN.md) for full details.

## Development

### Adding a New Workflow Type

1. Create directory: `workflow/{workflow_type}/`
2. Create configuration file: `{WorkflowType}StepConfigurations.ts`
3. Create handlers file: `{WorkflowType}StepHandlers.ts`
4. Create results display: `{WorkflowType}ResultsDisplay.tsx`
5. Create main component: `{WorkflowType}WorkflowOverlay.tsx`
6. Update router in `WorkflowExecutionOverlay.tsx`

### Adding a New Step to Existing Workflow

1. Add step configuration in `{WorkflowType}StepConfigurations.ts`
2. Add step handler in `{WorkflowType}StepHandlers.ts`
3. Add results display in `{WorkflowType}ResultsDisplay.tsx`
4. Update step array in main component

### Testing

Each workflow component should be tested independently:

```bash
# Run tests for specific workflow
npm test -- --grep "BAWorkflowOverlay"
npm test -- --grep "DeveloperWorkflowOverlay"
npm test -- --grep "AnalystWorkflowOverlay"
```

## Best Practices

1. **Use Shared Utilities:** Import from `workflowUtils.ts` instead of duplicating code
2. **Type Safety:** Use interfaces from `workflowTypes.ts` for consistency
3. **Component Size:** Keep components under 500 lines when possible
4. **Separation of Concerns:** 
   - Configurations in separate files
   - Business logic in handlers
   - UI rendering in display components
5. **Error Handling:** Always wrap API calls in try-catch blocks
6. **Loading States:** Show loading indicators during async operations
7. **User Feedback:** Use toast notifications for success/error messages

## Troubleshooting

### Issue: Workflow not loading
- Check `workflow.workflow_type` value
- Ensure router case matches workflow type
- Verify component imports

### Issue: Step execution failing
- Check API endpoint URL
- Verify authentication token
- Review handler implementation
- Check browser console for errors

### Issue: Results not displaying
- Verify result structure matches expected format
- Check conditional rendering in results display
- Ensure `currentStepResult` is set correctly

## Contributing

When contributing to workflow components:

1. Follow the established directory structure
2. Use TypeScript for type safety
3. Add JSDoc comments for complex functions
4. Write unit tests for new features
5. Update this README if adding new patterns
6. Follow the refactoring plan when making large changes

## Related Documentation

- [Workflow Overlay Refactoring Plan](../../../WORKFLOW_OVERLAY_REFACTORING_PLAN.md)
- [Workflow Simplification Guide](../../../WORKFLOW_SIMPLIFICATION_GUIDE.md)
- [Developer Dropdown Fix](../../../DEVELOPER_DROPDOWN_FIX.md)

## Contact

For questions or issues with workflow components:
- Review relevant documentation
- Check WORKFLOW_OVERLAY_REFACTORING_PLAN.md for refactoring details
- Contact development team lead

**Last Updated:** 2026-04-05
