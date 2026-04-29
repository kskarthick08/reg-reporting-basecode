import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import '@/components/css/WorkflowMainPage.css';
import '@/components/css/WorkflowPage.css';
import { workflowService } from '@/services/workflowService';
import { Workflow } from '@/types';
import { WorkflowExecutionEntry } from '@/components/workflow/WorkflowExecutionEntry';
import { WorkflowList } from '@/components/workflow/WorkflowList';
import { WorkflowDetails } from '@/components/workflow/WorkflowDetails';
import { WorkflowDetailsWithStages } from '@/components/workflow/WorkflowDetailsWithStages';
import { WorkflowCreateDialog } from '@/components/workflow/WorkflowCreateDialog';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { useAuthStore } from '@/store/authStore';

const WorkflowPage = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    persona: 'Complete', // Always use Complete (multi-stage) workflow type
    version: '1.0',
    description: ''
  });
  const [executionOverlayOpen, setExecutionOverlayOpen] = useState(false);
  const [executionStepIndex, setExecutionStepIndex] = useState(0);
  const [executionMode, setExecutionMode] = useState<'quick' | 'full'>('quick');
  const [visibleStages, setVisibleStages] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [supervisorAgentEnabled, setSupervisorAgentEnabled] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | undefined>(undefined);
  const [artifactsExpanded, setArtifactsExpanded] = useState<boolean>(false);

  const toggleStageVisibility = (stage: string) => {
    setVisibleStages((prev) => {
      // If clicking the same stage that's already visible, hide it
      if (prev.has(stage) && prev.size === 1) {
        return new Set();
      }
      // Otherwise, show only the clicked stage
      return new Set([stage]);
    });
  };

  const handleStageClick = (stage: string) => {
    // Toggle the stage card visibility
    toggleStageVisibility(stage);
  };

  // Check if user can create workflows
  const canCreateWorkflow = user && (
    user.role?.name === 'Super User' ||
    user.role?.name === 'Admin' ||
    user.role?.name === 'Regulatory Business Analyst'
  );

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // Auto-open create dialog if navigated from dashboard
  useEffect(() => {
    if (location.state) {
      const state = location.state as any;

      // Open create dialog
      if (state.openCreateDialog) {
        setDialogOpen(true);
        // Clear the state to prevent dialog from reopening on refresh
        window.history.replaceState({}, document.title);
      }

      // Filter by draft status
      if (state.filterByDraft) {
        setFilterStatus('draft');
        // Auto-select first draft workflow after workflows are loaded
        setTimeout(() => {
          const draftWorkflows = workflows.filter(wf => wf.status === 'draft');
          if (draftWorkflows.length > 0) {
            setSelectedWorkflow(draftWorkflows[0]);
          }
        }, 500);
        // Clear the state
        window.history.replaceState({}, document.title);
      }
    }
  }, [location, workflows]);

  const fetchWorkflows = async () => {
    try {
      const data: any = await workflowService.getAll();
      // Handle paginated response with 'items' property, or array, or legacy 'workflows' property
      const workflowsArray = Array.isArray(data)
        ? data
        : (data?.items || data?.workflows || []);
      setWorkflows(workflowsArray);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      setWorkflows([]); // Set empty array on error
    }
  };

  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleCreateWorkflow = async () => {
    try {
      // Always create Complete (multi-stage) workflow type
      await workflowService.createByPersona({
        ...newWorkflow,
        persona: 'Complete' // Force multi-stage workflow
      });
      setDialogOpen(false);
      setNewWorkflow({ name: '', persona: 'Complete', version: '1.0', description: '' });
      fetchWorkflows();
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow. Please try again.');
    }
  };

  const handleDeleteClick = (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) return;
    
    try {
      await workflowService.delete(workflowToDelete.id);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      
      if (selectedWorkflow?.id === workflowToDelete.id) {
        setSelectedWorkflow(null);
      }
      
      fetchWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setWorkflowToDelete(null);
  };

  // Helper function to get stage-specific steps
  const getStageSteps = (stage?: string) => {
    if (!stage) return [];

    const stageStepsMap: Record<string, string[]> = {
      'business_analyst': [
        'Select Documents',
        'Comparison',
        'Field Mapping',
        'Functional Specification',
        'Assign to Developer'
      ],
      'developer': [
        'Schema Generator',
        'Schema Analyzer',
        'SQL Generator',
        'Python ETL Generator',
        'Deterministic Mapping',
        'Test Integration',
        'Assign to Reviewer'
      ],
      'reviewer': [
        'Validation',
        'Anomaly Detection',
        'Variance Explanation',
        'Cross Report Reconciliation',
        'Audit Pack Generator',
        'PSD CSV Generator',
        'Complete Workflow'
      ]
    };

    return stageStepsMap[stage] || [];
  };

  // Filter workflows based on status
  const filteredWorkflows = filterStatus === 'all'
    ? workflows
    : workflows.filter(wf => wf.status === filterStatus);

  return (
    <div className="wfp-viewport">
      <div className="wfp-control-panel">
        <div className="wfp-title-section">
          <h1 className="wfp-heading-primary">Workflows</h1>
          <p className="wfp-subtitle-text">Design and manage your workflow pipelines</p>
        </div>
        <div className="wfp-header-actions">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#495057',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Workflows</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <Button
            onClick={() => setDialogOpen(true)}
            className="wfp-action-button"
            disabled={!canCreateWorkflow}
            title={!canCreateWorkflow ? 'Only Admin, Super Admin, or Business Analyst can create workflows' : ''}
          >
            <svg className="wfp-button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Workflow
          </Button>
        </div>
      </div>

      <div className="wfp-layout-container">
        <Card className="wfp-sidebar-panel">
          <CardHeader>
            <CardTitle>
              Workflows
              {filterStatus !== 'all' && (
                <span className="wfp-workflow-count">
                  ({filteredWorkflows.length} {filterStatus})
                </span>
              )}
            </CardTitle>
            <CardDescription>Select a workflow to view details</CardDescription>
          </CardHeader>
          <CardContent className="wfp-sidebar-content wfp-sidebar-content-no-padding">
            <WorkflowList
              workflows={filteredWorkflows}
              selectedWorkflow={selectedWorkflow}
              onSelect={handleWorkflowSelect}
              onDelete={handleDeleteClick}
            />
          </CardContent>
        </Card>

        <Card className="wfp-details-panel">
          <CardHeader className="wfp-details-header-reduced-padding">
            <CardTitle>Workflow Details</CardTitle>
            <CardDescription>Information about the selected workflow</CardDescription>
          </CardHeader>
          <CardContent className="wfp-details-content wfp-details-content-flex">
            {selectedWorkflow ? (
              selectedWorkflow.current_stage ? (
                <WorkflowDetailsWithStages
                  workflow={selectedWorkflow}
                  onExecuteStep={(stepId) => {
                    // Find step index from stepId if needed
                    setExecutionMode('quick');
                    setExecutionStepIndex(0);
                    setExecutionOverlayOpen(true);
                  }}
                  onRefresh={fetchWorkflows}
                />
              ) : (
                <WorkflowDetails
                  workflow={selectedWorkflow}
                  onExecuteStep={(idx) => {
                    setExecutionMode('quick');
                    setExecutionStepIndex(idx);
                    setExecutionOverlayOpen(true);
                  }}
                />
              )
            ) : (
              <div className="wfp-empty-state-container">
                <svg className="wfp-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="wfp-empty-text">Select a workflow to view details</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="wfp-workflow-details-wrapper">
          {selectedWorkflow && selectedWorkflow.current_stage && (
            <>
              {/* Workflow Pipeline Card */}
              <Card style={{ flexShrink: 0, maxHeight: 'fit-content', overflow: 'visible' }}>
                <CardHeader>
                  <CardTitle>Workflow Pipeline</CardTitle>
                  <CardDescription>End-to-end workflow progression across all stages</CardDescription>
                </CardHeader>
                <CardContent className="wfp-info-content-reduced-padding">
                  <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'flex-start',
                    height: 'fit-content'
                  }}>
                    {/* Left side: Pipeline Container */}
                    <div style={{
                      flex: 1,
                      minWidth: 0,
                      height: 'fit-content'
                    }}>
                      {/* Pipeline Progress */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        gap: '0',
                        overflowX: 'auto',
                        padding: '0.5rem 2rem 0.25rem 2rem',
                        width: '100%'
                      }}>
                  {/* Start Node */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    minWidth: 'fit-content'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                    }}>
                      <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#166534' }}>Start</span>
                  </div>

                  {/* Connection Line */}
                  <div style={{ flex: 1, height: '3px', background: '#86efac', minWidth: '80px', maxWidth: '150px' }} />

                  {/* Stage 1 - BA */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    minWidth: 'fit-content'
                  }}>
                    <div
                      onClick={() => handleStageClick('business_analyst')}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: selectedWorkflow.current_stage === 'business_analyst'
                          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                          : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        border: '4px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedWorkflow.current_stage === 'business_analyst'
                          ? '0 6px 16px rgba(251, 191, 36, 0.4)'
                          : '0 4px 12px rgba(34, 197, 94, 0.3)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(251, 191, 36, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = selectedWorkflow.current_stage === 'business_analyst'
                          ? '0 6px 16px rgba(251, 191, 36, 0.4)'
                          : '0 4px 12px rgba(34, 197, 94, 0.3)';
                      }}
                    >
                      {selectedWorkflow.current_stage === 'business_analyst' && (
                        <div style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: '3px solid white',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }} />
                      )}
                      {selectedWorkflow.current_stage === 'business_analyst' ? (
                        <span style={{ fontSize: '1.125rem', fontWeight: '800', color: 'white' }}>1</span>
                      ) : (
                        <svg style={{ width: '28px', height: '28px', color: 'white' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.8125rem',
                        fontWeight: '700',
                        color: selectedWorkflow.current_stage === 'business_analyst' ? '#92400e' : '#166534',
                        display: 'block'
                      }}>
                        Stage 1
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Business Analyst</span>
                    </div>
                  </div>

                  {/* Connection Line */}
                  <div style={{
                    flex: 1,
                    height: '3px',
                    background: selectedWorkflow.current_stage === 'developer' || selectedWorkflow.current_stage === 'reviewer' ? '#86efac' : '#e5e7eb',
                    minWidth: '80px',
                    maxWidth: '150px'
                  }} />

                  {/* Stage 2 - Developer */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    minWidth: 'fit-content'
                  }}>
                    <div
                      onClick={() => handleStageClick('developer')}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: selectedWorkflow.current_stage === 'developer'
                          ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
                          : selectedWorkflow.current_stage === 'reviewer'
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                          : 'linear-gradient(135deg, #e5e7eb 0%, #cbd5e1 100%)',
                        border: '4px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedWorkflow.current_stage === 'developer'
                          ? '0 6px 16px rgba(167, 139, 250, 0.4)'
                          : selectedWorkflow.current_stage === 'reviewer'
                          ? '0 4px 12px rgba(34, 197, 94, 0.3)'
                          : '0 2px 6px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {selectedWorkflow.current_stage === 'developer' && (
                        <div style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: '3px solid white',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }} />
                      )}
                      {selectedWorkflow.current_stage === 'reviewer' ? (
                        <svg style={{ width: '28px', height: '28px', color: 'white' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span style={{
                          fontSize: '1.125rem',
                          fontWeight: '800',
                          color: selectedWorkflow.current_stage === 'developer' ? 'white' : '#94a3b8'
                        }}>
                          2
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.8125rem',
                        fontWeight: '700',
                        color: selectedWorkflow.current_stage === 'developer' ? '#5b21b6' : selectedWorkflow.current_stage === 'reviewer' ? '#166534' : '#94a3b8',
                        display: 'block'
                      }}>
                        Stage 2
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Developer</span>
                    </div>
                  </div>

                  {/* Connection Line */}
                  <div style={{
                    flex: 1,
                    height: '3px',
                    background: selectedWorkflow.current_stage === 'reviewer' ? '#86efac' : '#e5e7eb',
                    minWidth: '80px',
                    maxWidth: '150px'
                  }} />

                  {/* Stage 3 - Reviewer */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    minWidth: 'fit-content'
                  }}>
                    <div
                      onClick={() => handleStageClick('reviewer')}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: selectedWorkflow.current_stage === 'reviewer'
                          ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'
                          : 'linear-gradient(135deg, #e5e7eb 0%, #cbd5e1 100%)',
                        border: '4px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedWorkflow.current_stage === 'reviewer'
                          ? '0 6px 16px rgba(96, 165, 250, 0.4)'
                        : '0 2px 6px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {selectedWorkflow.current_stage === 'reviewer' && (
                        <div style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: '3px solid white',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }} />
                      )}
                      <span style={{
                        fontSize: '1.125rem',
                        fontWeight: '800',
                        color: selectedWorkflow.current_stage === 'reviewer' ? 'white' : '#94a3b8'
                      }}>
                        3
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.8125rem',
                        fontWeight: '700',
                        color: selectedWorkflow.current_stage === 'reviewer' ? '#1e40af' : '#94a3b8',
                        display: 'block'
                      }}>
                        Stage 3
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Reviewer</span>
                    </div>
                  </div>

                  {/* Connection Line */}
                  <div style={{ flex: 1, height: '3px', background: '#e5e7eb', minWidth: '80px', maxWidth: '150px' }} />

                  {/* End Node */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    minWidth: 'fit-content'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e5e7eb 0%, #cbd5e1 100%)',
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                      <svg style={{ width: '24px', height: '24px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>End</span>
                  </div>
                  </div>

                  {/* Stage Details Grid */}
                  {visibleStages.size > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${visibleStages.size}, 1fr)`,
                    gap: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    {/* Business Analyst Stage Card */}
                    {visibleStages.has('business_analyst') && (
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: selectedWorkflow.current_stage === 'business_analyst'
                        ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                        : selectedWorkflow.ba_stage_completed_at
                        ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                        : '#f8fafc',
                      border: selectedWorkflow.current_stage === 'business_analyst'
                        ? '2px solid #fbbf24'
                        : selectedWorkflow.ba_stage_completed_at
                        ? '2px solid #86efac'
                        : '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      boxShadow: selectedWorkflow.current_stage === 'business_analyst'
                        ? '0 4px 12px rgba(251, 191, 36, 0.3)'
                        : '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}>
                      {/* Left side - Stage Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '0.5rem',
                            background: selectedWorkflow.current_stage === 'business_analyst'
                              ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                              : selectedWorkflow.ba_stage_completed_at
                              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                              : '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                          }}>
                            <svg style={{ width: '16px', height: '16px', color: selectedWorkflow.ba_stage_completed_at || selectedWorkflow.current_stage === 'business_analyst' ? 'white' : '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="wfp-info-section">
                            <h4 style={{
                              fontSize: '0.875rem',
                              fontWeight: '700',
                              color: '#0f172a',
                              margin: 0,
                              marginBottom: '0.125rem'
                            }}>
                              Business Analyst
                            </h4>
                            <p style={{
                              fontSize: '0.6875rem',
                              color: '#64748b',
                              margin: 0,
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.025em'
                            }}>
                              {selectedWorkflow.ba_stage_completed_at ? 'Completed' : selectedWorkflow.current_stage === 'business_analyst' ? 'In Progress' : 'Pending'}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tasks:</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e293b' }}>6 Steps</span>
                          </div>
                          {selectedWorkflow.ba_stage_completed_at && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                              <svg style={{ width: '12px', height: '12px', color: '#16a34a' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: '600' }}>Completed</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side - Stage Artifacts */}
                      <div style={{
                        flex: 1,
                        borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
                        paddingLeft: '0.75rem'
                      }}>
                        <h5 style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#64748b',
                          margin: 0,
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Stage Artifacts
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          {/* Reports */}
                          <div style={{
                            padding: '0.5rem',
                            background: '#dbeafe',
                            border: '1px solid #93c5fd',
                            borderRadius: '0.375rem',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#3b82f6',
                              margin: 0,
                              marginBottom: '0.125rem'
                            }}>
                              {(() => {
                                const baSteps = selectedWorkflow?.steps?.filter(s =>
                                  s.stage === 'business_analyst' && s.status === 'completed'
                                ) || [];
                                return baSteps.length;
                              })()}
                            </p>
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#64748b',
                              margin: 0,
                              fontWeight: '500'
                            }}>
                              Reports
                            </p>
                          </div>

                          {/* Documents */}
                          <div style={{
                            padding: '0.5rem',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            borderRadius: '0.375rem',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#10b981',
                              margin: 0,
                              marginBottom: '0.125rem'
                            }}>
                              {(() => {
                                const baSteps = selectedWorkflow?.steps?.filter(s =>
                                  s.stage === 'business_analyst' && s.status === 'completed'
                                ) || [];
                                return baSteps.length > 0 ? baSteps.length : 0;
                              })()}
                            </p>
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#64748b',
                              margin: 0,
                              fontWeight: '500'
                            }}>
                              Documents
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Developer Stage Card */}
                    {visibleStages.has('developer') && (
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: selectedWorkflow.current_stage === 'developer'
                        ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)'
                        : selectedWorkflow.developer_stage_completed_at
                        ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                        : '#f8fafc',
                      border: selectedWorkflow.current_stage === 'developer'
                        ? '2px solid #a78bfa'
                        : selectedWorkflow.developer_stage_completed_at
                        ? '2px solid #86efac'
                        : '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      boxShadow: selectedWorkflow.current_stage === 'developer'
                        ? '0 4px 12px rgba(167, 139, 250, 0.3)'
                        : '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}>
                      {/* Left side - Stage Info */}
                      <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0.5rem',
                          background: selectedWorkflow.current_stage === 'developer'
                            ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
                            : selectedWorkflow.developer_stage_completed_at
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                        }}>
                          <svg style={{ width: '16px', height: '16px', color: selectedWorkflow.developer_stage_completed_at || selectedWorkflow.current_stage === 'developer' ? 'white' : '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </div>
                        <div className="wfp-info-section">
                          <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: '700',
                            color: '#0f172a',
                            margin: 0,
                            marginBottom: '0.125rem'
                          }}>
                            Developer
                          </h4>
                          <p style={{
                            fontSize: '0.6875rem',
                            color: '#64748b',
                            margin: 0,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.025em'
                          }}>
                            {selectedWorkflow.developer_stage_completed_at ? 'Completed' : selectedWorkflow.current_stage === 'developer' ? 'In Progress' : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tasks:</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e293b' }}>7 Steps</span>
                        </div>
                        {selectedWorkflow.developer_stage_completed_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <svg style={{ width: '12px', height: '12px', color: '#16a34a' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: '600' }}>Completed</span>
                          </div>
                        )}
                      </div>
                      </div>

                      {/* Right side - Stage Artifacts */}
                      <div style={{
                        flex: 1,
                        borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
                        paddingLeft: '0.75rem'
                      }}>
                        <h5 style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#64748b',
                          margin: 0,
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Stage Artifacts
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          {/* SQL Files */}
                          <div style={{
                            padding: '0.5rem',
                            background: '#ddd6fe',
                            border: '1px solid #c4b5fd',
                            borderRadius: '0.375rem',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#8b5cf6',
                              margin: 0,
                              marginBottom: '0.125rem'
                            }}>
                              {(() => {
                                const devSteps = selectedWorkflow?.steps?.filter(s =>
                                  s.stage === 'developer' && s.status === 'completed'
                                ) || [];
                                return devSteps.length;
                              })()}
                            </p>
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#64748b',
                              margin: 0,
                              fontWeight: '500'
                            }}>
                              SQL Files
                            </p>
                          </div>

                          {/* ETL Scripts */}
                          <div style={{
                            padding: '0.5rem',
                            background: '#fef3c7',
                            border: '1px solid #fcd34d',
                            borderRadius: '0.375rem',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#f59e0b',
                              margin: 0,
                              marginBottom: '0.125rem'
                            }}>
                              {(() => {
                                const devSteps = selectedWorkflow?.steps?.filter(s =>
                                  s.stage === 'developer' && s.status === 'completed'
                                ) || [];
                                return devSteps.length > 0 ? devSteps.length : 0;
                              })()}
                            </p>
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#64748b',
                              margin: 0,
                              fontWeight: '500'
                            }}>
                              ETL Scripts
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Reviewer Stage Card */}
                    {visibleStages.has('reviewer') && (
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: selectedWorkflow.current_stage === 'reviewer'
                        ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                        : selectedWorkflow.reviewer_stage_completed_at
                        ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                        : '#f8fafc',
                      border: selectedWorkflow.current_stage === 'reviewer'
                        ? '2px solid #60a5fa'
                        : selectedWorkflow.reviewer_stage_completed_at
                        ? '2px solid #86efac'
                        : '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      boxShadow: selectedWorkflow.current_stage === 'reviewer'
                        ? '0 4px 12px rgba(96, 165, 250, 0.3)'
                        : '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}>
                      {/* Left side - Stage Info */}
                      <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0.5rem',
                          background: selectedWorkflow.current_stage === 'reviewer'
                            ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'
                            : selectedWorkflow.reviewer_stage_completed_at
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                        }}>
                          <svg style={{ width: '16px', height: '16px', color: selectedWorkflow.reviewer_stage_completed_at || selectedWorkflow.current_stage === 'reviewer' ? 'white' : '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="wfp-info-section">
                          <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: '700',
                            color: '#0f172a',
                            margin: 0,
                            marginBottom: '0.125rem'
                          }}>
                            Reviewer
                          </h4>
                          <p style={{
                            fontSize: '0.6875rem',
                            color: '#64748b',
                            margin: 0,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.025em'
                          }}>
                            {selectedWorkflow.reviewer_stage_completed_at ? 'Completed' : selectedWorkflow.current_stage === 'reviewer' ? 'In Progress' : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tasks:</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e293b' }}>7 Steps</span>
                        </div>
                        {selectedWorkflow.reviewer_stage_completed_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <svg style={{ width: '12px', height: '12px', color: '#16a34a' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: '600' }}>Completed</span>
                          </div>
                        )}
                      </div>
                      </div>

                      {/* Right side - Stage Artifacts */}
                      <div style={{
                        flex: 1,
                        borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
                        paddingLeft: '0.75rem'
                      }}>
                        <h5 style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#64748b',
                          margin: 0,
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Stage Artifacts
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          {/* Audit Reports */}
                          <div style={{
                            padding: '0.5rem',
                            background: '#dbeafe',
                            border: '1px solid #93c5fd',
                            borderRadius: '0.375rem',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#3b82f6',
                              margin: 0,
                              marginBottom: '0.125rem'
                            }}>
                              {(() => {
                                const reviewSteps = selectedWorkflow?.steps?.filter(s =>
                                  s.stage === 'reviewer' && s.status === 'completed'
                                ) || [];
                                return reviewSteps.length;
                              })()}
                            </p>
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#64748b',
                              margin: 0,
                              fontWeight: '500'
                            }}>
                              Audit Reports
                            </p>
                          </div>

                          {/* PSD CSV */}
                          <div style={{
                            padding: '0.5rem',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            borderRadius: '0.375rem',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#10b981',
                              margin: 0,
                              marginBottom: '0.125rem'
                            }}>
                              {(() => {
                                const reviewSteps = selectedWorkflow?.steps?.filter(s =>
                                  s.stage === 'reviewer' && s.status === 'completed'
                                ) || [];
                                return reviewSteps.length > 0 ? 1 : 0;
                              })()}
                            </p>
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#64748b',
                              margin: 0,
                              fontWeight: '500'
                            }}>
                              PSD CSV
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                  )}
                    </div>

                    {/* Right side: Workflow Execution Panel */}
                    <div style={{
                      background: 'white',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      border: '1px solid #e5e7eb',
                      minWidth: '260px',
                      maxWidth: '280px',
                      width: '280px',
                      flexShrink: 0,
                      alignSelf: 'flex-start'
                    }}>
                      <h3 style={{
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <svg style={{ width: '16px', height: '16px', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Workflow Execution
                      </h3>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.625rem',
                        background: '#f8fafc',
                        borderRadius: '0.5rem',
                        marginBottom: '0.625rem',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <svg style={{ width: '14px', height: '14px', color: '#8b5cf6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                              Supervisor Agent
                            </p>
                            <p style={{ fontSize: '0.625rem', color: '#64748b', margin: 0 }}>
                              {supervisorAgentEnabled ? 'Auto' : 'Manual'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSupervisorAgentEnabled(!supervisorAgentEnabled)}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '20px',
                            background: supervisorAgentEnabled ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : '#cbd5e1',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: supervisorAgentEnabled ? '0 2px 4px rgba(139, 92, 246, 0.3)' : 'none'
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: supervisorAgentEnabled ? '22px' : '2px',
                            width: '16px',
                            height: '16px',
                            background: 'white',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                          }} />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setExecutionStepIndex(0);
                          setExecutionOverlayOpen(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.625rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontWeight: '600',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                        }}
                      >
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Execute Workflow</span>
                      </button>

                      <p style={{
                        fontSize: '0.6875rem',
                        color: '#94a3b8',
                        marginTop: '0.5rem',
                        marginBottom: 0,
                        textAlign: 'center'
                      }}>
                        {supervisorAgentEnabled ? '🤖 Auto-execute' : '👆 Manual control'}
                      </p>
                    </div>

                  </div>
                </CardContent>
              </Card>

            </>
          )}

          <Card className="wfp-canvas-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <CardHeader className="wfp-details-header-reduced-padding">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <CardTitle>Workflow Visualization</CardTitle>
                  <CardDescription>Interactive diagram showing workflow structure and agent relationships</CardDescription>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {/* Placeholder for future controls */}
                </div>
              </div>
            </CardHeader>
            <CardContent className="wfp-canvas-content" style={{ overflow: 'visible' }}>
              {selectedWorkflow ? (
                <div className="wfp-canvas-wrapper" style={{ overflow: 'visible' }}>
                  <div className="wfp-canvas-inner" style={{ overflow: 'visible' }}>
                    <WorkflowCanvas
                      workflow={selectedWorkflow}
                      executionMode={executionMode}
                      onExecutionModeChange={setExecutionMode}
                      onExecute={() => {
                        setExecutionStepIndex(0);
                        setExecutionOverlayOpen(true);
                      }}
                      renderProgressOnly={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="wfp-empty-state">
                  <svg className="wfp-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="wfp-empty-message">Select a workflow to view its structure</p>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <WorkflowCreateDialog
        isOpen={dialogOpen}
        formData={newWorkflow}
        onChange={setNewWorkflow}
        onSubmit={handleCreateWorkflow}
        onClose={() => setDialogOpen(false)}
        userRole={user?.role?.name}
      />

      {deleteDialogOpen && (
        <div className="wfp-modal-overlay" onClick={handleDeleteCancel}>
          <div className="wfp-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wfp-modal-header">
              <h2 className="wfp-modal-title">Delete Workflow</h2>
              <button className="wfp-modal-close" onClick={handleDeleteCancel}>
                <svg className="wfp-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="wfp-modal-body">
              <p>Are you sure you want to delete the workflow "{workflowToDelete?.workflow_name}"? This action cannot be undone.</p>
            </div>
            <div className="wfp-modal-footer">
              <Button onClick={handleDeleteCancel} className="wfp-cancel-btn">
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} className="wfp-submit-btn" style={{ background: '#ef4444' }}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {executionOverlayOpen && selectedWorkflow && (
        <WorkflowExecutionEntry
          workflow={selectedWorkflow}
          initialStepIndex={executionStepIndex}
          onClose={() => {
            setExecutionOverlayOpen(false);
            setSelectedStage(undefined); // Clear selected stage when closing
          }}
          executionMode={executionMode}
          overrideStage={selectedStage}
        />
      )}
    </div>
  );
};


export default WorkflowPage;
