/**
 * Stage Assignment Modal Component
 *
 * Professional modal for transitioning workflows between stages (BA → Developer → Reviewer).
 * Matches the design quality of WorkflowExecutionOverlay with modern UI/UX.
 */

import React, { useState, useEffect } from 'react';
import { Workflow } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  CheckCircle2,
  ArrowRight,
  User,
  Clock,
  AlertCircle,
  FileText,
  XCircle
} from 'lucide-react';
import workflowAssignmentService from '@/services/workflowAssignmentService';
import { showToast } from '@/lib/toast';

interface StageAssignmentModalProps {
  workflow: Workflow;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserOption {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: {
    name: string;
  };
}

export const StageAssignmentModal: React.FC<StageAssignmentModalProps> = ({
  workflow,
  onClose,
  onSuccess
}) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [priority, setPriority] = useState<string>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const currentStage = workflow.current_stage || 'business_analyst';
  const nextStage = getNextStage(currentStage);
  const isFinalStage = currentStage === 'reviewer';

  useEffect(() => {
    fetchUsers();
  }, [nextStage]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/auth/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const allUsers = await response.json();

      // Filter users by role for next stage
      let filteredUsers = allUsers;
      if (nextStage === 'developer') {
        filteredUsers = allUsers.filter((u: UserOption) =>
          u.role?.name === 'Data Engineer/Developer' || u.role?.name === 'Admin' || u.role?.name === 'Super Admin'
        );
      } else if (nextStage === 'reviewer') {
        filteredUsers = allUsers.filter((u: UserOption) =>
          u.role?.name === 'Regulatory Reporting Analyst' || u.role?.name === 'Admin' || u.role?.name === 'Super Admin'
        );
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async () => {
    if (!comments.trim()) {
      showToast.error('Please provide assignment notes');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isFinalStage) {
        // Complete the workflow
        await workflowAssignmentService.completeWorkflow(workflow.id, {
          comments,
          priority
        });
        showToast.success('Workflow completed successfully!');
      } else {
        // Assign to next stage pool (no specific user assignment)
        await workflowAssignmentService.assignToStage(workflow.id, {
          to_user_id: null, // null means common pool
          comments,
          priority,
          stage: nextStage
        });
        showToast.success(`Workflow submitted to ${getStageDisplayName(nextStage)} pool`);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to assign workflow:', error);
      showToast.error(error.response?.data?.detail || 'Failed to assign workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                {isFinalStage ? 'Complete Workflow' : `Assign to ${getStageDisplayName(nextStage)}`}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                {workflow.workflow_name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <XCircle size={20} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Stage Progression Visual */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <StageBox
                label="Business Analyst"
                status={currentStage === 'business_analyst' ? 'current' : 'completed'}
                color="#f59e0b"
              />
              <ArrowRight size={24} color="#94a3b8" style={{ margin: '0 0.5rem' }} />
              <StageBox
                label="Developer"
                status={
                  currentStage === 'business_analyst' ? 'next' :
                  currentStage === 'developer' ? 'current' : 'completed'
                }
                color="#8b5cf6"
              />
              <ArrowRight size={24} color="#94a3b8" style={{ margin: '0 0.5rem' }} />
              <StageBox
                label="Reviewer"
                status={currentStage === 'reviewer' ? 'current' : 'next'}
                color="#3b82f6"
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'white',
              borderRadius: '0.5rem',
              border: '1px solid #bae6fd'
            }}>
              <CheckCircle2 size={18} color="#0ea5e9" />
              <span style={{ fontSize: '0.875rem', color: '#0c4a6e', fontWeight: '500' }}>
                {getStageDisplayName(currentStage)} stage completed successfully
              </span>
            </div>
          </div>

          {/* Stage Completion Summary */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1e293b',
              marginTop: 0,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileText size={18} />
              Stage Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <SummaryItem
                label="Steps Completed"
                value={`${getCompletedStepsCount(workflow)} steps`}
                icon={<CheckCircle2 size={16} color="#10b981" />}
              />
              <SummaryItem
                label="Current Stage"
                value={getStageDisplayName(currentStage)}
                icon={<Clock size={16} color="#f59e0b" />}
              />
            </div>
          </div>

          {/* Submission Info */}
          {!isFinalStage && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #bae6fd',
              borderRadius: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <User size={16} color="#0284c7" />
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e' }}>
                  Submit to {getStageDisplayName(nextStage)} Pool
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: 0 }}>
                This workflow will be submitted to the common {getStageDisplayName(nextStage).toLowerCase()} pool.
                Any {getStageDisplayName(nextStage).toLowerCase()} can pick it up from their queue.
              </p>
            </div>
          )}

          {/* Priority */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Label style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.5rem',
              display: 'block'
            }}>
              Priority
            </Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    padding: '0.75rem',
                    border: priority === p ? '2px solid' : '1px solid #e5e7eb',
                    borderColor: priority === p ? getPriorityColor(p) : '#e5e7eb',
                    background: priority === p ? `${getPriorityColor(p)}15` : 'white',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: priority === p ? '600' : '500',
                    fontSize: '0.875rem',
                    color: priority === p ? getPriorityColor(p) : '#64748b',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize'
                  }}
                  onMouseEnter={(e) => {
                    if (priority !== p) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (priority !== p) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment Notes */}
          <div>
            <Label style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.5rem',
              display: 'block'
            }}>
              {isFinalStage ? 'Completion Notes' : 'Assignment Notes'} <span style={{ color: '#ef4444' }}>*</span>
            </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                isFinalStage
                  ? "Summarize the workflow results and any important findings..."
                  : `Provide context and instructions for the ${getStageDisplayName(nextStage).toLowerCase()}...`
              }
              rows={6}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                borderColor: '#e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.75rem'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              These notes will be visible to the {isFinalStage ? 'workflow history' : 'assigned user'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} color="#f59e0b" />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              This action cannot be undone
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ minWidth: '100px' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !comments.trim()}
              style={{
                minWidth: '150px',
                background: isFinalStage
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none'
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem'
                  }} />
                  {isFinalStage ? 'Completing...' : 'Assigning...'}
                </>
              ) : (
                <>
                  {isFinalStage ? 'Complete Workflow' : `Assign to ${getStageDisplayName(nextStage)}`}
                  <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Helper Components
const StageBox: React.FC<{
  label: string;
  status: 'completed' | 'current' | 'next';
  color: string;
}> = ({ label, status, color }) => (
  <div style={{
    flex: 1,
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '2px solid',
    borderColor: status === 'current' ? color :
                 status === 'completed' ? '#10b981' : '#e5e7eb',
    background: status === 'current' ? `${color}15` :
                status === 'completed' ? '#f0fdf4' : 'white',
    textAlign: 'center',
    position: 'relative'
  }}>
    {status === 'completed' && (
      <div style={{
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        background: '#10b981',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CheckCircle2 size={14} color="white" />
      </div>
    )}
    <div style={{
      fontSize: '0.75rem',
      fontWeight: '600',
      color: status === 'current' ? color :
             status === 'completed' ? '#10b981' : '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '0.625rem',
      color: '#64748b',
      marginTop: '0.25rem',
      textTransform: 'uppercase'
    }}>
      {status === 'completed' ? 'Completed' :
       status === 'current' ? 'Current' : 'Pending'}
    </div>
  </div>
);

const SummaryItem: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb'
  }}>
    {icon}
    <div>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>{value}</div>
    </div>
  </div>
);

// Helper Functions
function getNextStage(currentStage: string): string {
  const stageMap: Record<string, string> = {
    'business_analyst': 'developer',
    'developer': 'reviewer',
    'reviewer': 'complete'
  };
  return stageMap[currentStage] || 'developer';
}

function getStageDisplayName(stage: string): string {
  const displayNames: Record<string, string> = {
    'business_analyst': 'Business Analyst',
    'developer': 'Developer',
    'reviewer': 'Reviewer',
    'complete': 'Complete'
  };
  return displayNames[stage] || stage;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#f97316',
    'urgent': '#ef4444'
  };
  return colors[priority] || '#64748b';
}

function getCompletedStepsCount(workflow: Workflow): number {
  // This would need to be calculated from actual workflow steps
  // For now, returning a placeholder
  return workflow.current_step_index || 0;
}

export default StageAssignmentModal;
