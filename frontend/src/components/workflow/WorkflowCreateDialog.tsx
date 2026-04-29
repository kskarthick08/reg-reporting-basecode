/**
 * Enhanced Workflow Create Dialog with Multi-Stage Support
 *
 * Features:
 * - Only Admin/Super Admin/Business Analyst can create workflows
 * - Automatically creates multi-stage workflow (BA → Developer → Reviewer)
 * - Simplified UI - no persona selection needed
 * - Creator automatically assigned as BA stage assignee
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface WorkflowCreateDialogProps {
  isOpen: boolean;
  formData: {
    name: string;
    persona: string;
    version: string;
    description: string;
  };
  onChange: (data: any) => void;
  onSubmit: () => void;
  onClose: () => void;
  userRole?: string;
}

export const WorkflowCreateDialog: React.FC<WorkflowCreateDialogProps> = ({
  isOpen,
  formData,
  onChange,
  onSubmit,
  onClose,
  userRole,
}) => {
  if (!isOpen) return null;

  // Check if user has permission to create workflows
  const canCreateWorkflow = userRole && (
    userRole === 'Super User' ||
    userRole === 'Admin' ||
    userRole === 'Regulatory Business Analyst'
  );

  return (
    <div className="wfp-modal-overlay" onClick={onClose}>
      <div className="wfp-modal-container" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="wfp-modal-header">
          <h2 className="wfp-modal-title">Create New Multi-Stage Workflow</h2>
          <button className="wfp-modal-close" onClick={onClose}>
            <svg className="wfp-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="wfp-modal-body">
          {!canCreateWorkflow ? (
            <Alert className="bg-red-50 border-red-200 mb-4">
              <Info className="h-4 w-4 text-red-600" />
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  Only Admin, Super Admin, or Business Analyst roles can create workflows.
                </p>
              </div>
            </Alert>
          ) : (
            <>
              {/* Info Banner */}
              <Alert className="bg-blue-50 border-blue-200 mb-6">
                <Info className="h-4 w-4 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Multi-Stage Workflow Process
                  </p>
                  <p className="text-xs text-blue-700">
                    This workflow will progress through three stages:
                  </p>
                  <ol className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-decimal">
                    <li><strong>Business Analyst</strong> - Requirements gathering and analysis (you will be assigned)</li>
                    <li><strong>Developer</strong> - Implementation and development</li>
                    <li><strong>Reviewer</strong> - Testing and validation</li>
                  </ol>
                </div>
              </Alert>

              {/* Workflow Name */}
              <div className="wfp-form-group">
                <Label htmlFor="name" className="wfp-form-label">
                  Workflow Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => onChange({ ...formData, name: e.target.value })}
                  className="wfp-form-input"
                  placeholder="e.g., Basel III Q4 2024 Compliance Report"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Give your workflow a descriptive name
                </p>
              </div>

              {/* Version */}
              <div className="wfp-form-group">
                <Label htmlFor="version" className="wfp-form-label">
                  Version
                </Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => onChange({ ...formData, version: e.target.value })}
                  className="wfp-form-input"
                  placeholder="e.g., 1.0, 2024.Q4"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional version identifier for tracking
                </p>
              </div>

              {/* Description */}
              <div className="wfp-form-group">
                <Label htmlFor="description" className="wfp-form-label">
                  Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => onChange({ ...formData, description: e.target.value })}
                  className="wfp-form-textarea"
                  rows={4}
                  placeholder="Describe the purpose and goals of this workflow..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide context for other team members who will work on this workflow
                </p>
              </div>

              {/* Workflow Type Info - Hidden field, always set to Complete */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">What happens next?</h4>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>• You will be automatically assigned to the <strong>Business Analyst stage</strong></li>
                      <li>• Complete all BA stage steps and submit to a Developer</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="wfp-modal-footer">
          <Button onClick={onClose} className="wfp-cancel-btn">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            className="wfp-submit-btn"
            disabled={!canCreateWorkflow || !formData.name || !formData.description}
          >
            {canCreateWorkflow ? 'Create Workflow' : 'Insufficient Permissions'}
          </Button>
        </div>
      </div>
    </div>
  );
};
