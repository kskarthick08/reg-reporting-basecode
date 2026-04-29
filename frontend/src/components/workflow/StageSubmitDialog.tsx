/**
 * Stage Submit Dialog Component
 *
 * Dialog for submitting a stage to the next persona with validation.
 *
 * Features:
 * - User selection (filtered by next stage role)
 * - Required comments field
 * - Validation status display
 * - Artifact checklist
 * - Submit confirmation
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  User,
  Send,
  Loader2,
  FileText,
  Shield,
  Info,
} from 'lucide-react';
import {
  StageInfo,
  ValidationResult,
  getStageDisplayName,
  getNextStage,
  StageEnum,
} from '@/services/workflowStageService';
import { developerWorkflowService } from '@/services/developerWorkflowService';

// ============================================================================
// Types
// ============================================================================

interface StageSubmitDialogProps {
  isOpen: boolean;
  workflowId: string;
  stageInfo: StageInfo;
  validationResults: ValidationResult | null;
  availableUsers: Array<{ id: string; username: string; email: string; role_name?: string }>;
  isSubmitting: boolean;
  onSubmit: (userId: string, comments: string) => Promise<void>;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const StageSubmitDialog: React.FC<StageSubmitDialogProps> = ({
  isOpen,
  workflowId,
  stageInfo,
  validationResults,
  availableUsers,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loadingQualityGate, setLoadingQualityGate] = useState(false);
  const [qualityGateResults, setQualityGateResults] = useState<any>(null);
  const [csvValidationResults, setCSVValidationResults] = useState<any>(null);

  const nextStage = getNextStage(stageInfo.current_stage as StageEnum);
  const nextStageName = nextStage ? getStageDisplayName(nextStage) : 'Final Review';
  const isDeveloperStage = stageInfo.current_stage === StageEnum.DEVELOPER;

  // Reset form and load quality gate when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setComments('');
      setErrors([]);
      setQualityGateResults(null);
      setCSVValidationResults(null);

      // Load quality gate results for developer stage
      if (isDeveloperStage) {
        loadQualityGateResults();
      }
    }
  }, [isOpen, isDeveloperStage]);

  const loadQualityGateResults = async () => {
    setLoadingQualityGate(true);
    try {
      // Run quality gate check
      const qgResults = await developerWorkflowService.runQualityGate(workflowId, 'standard');
      setQualityGateResults(qgResults);

      // Get CSV validation results if available
      const csvFiles = await developerWorkflowService.listCSVFiles(workflowId);
      if (csvFiles.length >= 2) {
        const actualFile = csvFiles.find((f: any) => f.file_type === 'actual');
        const expectedFile = csvFiles.find((f: any) => f.file_type === 'expected');

        if (actualFile && expectedFile) {
          const csvResults = await developerWorkflowService.validateCSVData(
            workflowId,
            actualFile.file_id,
            expectedFile.file_id
          );
          setCSVValidationResults(csvResults);
        }
      }
    } catch (error) {
      console.error('Error loading quality gate results:', error);
    } finally {
      setLoadingQualityGate(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!selectedUserId) {
      newErrors.push('Please select a user to assign the next stage to');
    }

    if (!comments || comments.trim().length < 10) {
      newErrors.push('Comments must be at least 10 characters long');
    }

    if (validationResults && !validationResults.is_valid) {
      newErrors.push('Stage validation must pass before submission');
    }

    // Check quality gate for developer stage
    if (isDeveloperStage && qualityGateResults) {
      if (!qualityGateResults.is_valid) {
        newErrors.push('Quality gate validation must pass before submission');
      }
      if (qualityGateResults.quality_score < 0.7) {
        newErrors.push(`Quality score (${(qualityGateResults.quality_score * 100).toFixed(0)}%) must be at least 70%`);
      }
    }

    // Check CSV validation for developer stage
    if (isDeveloperStage && csvValidationResults) {
      if (!csvValidationResults.is_valid) {
        newErrors.push('CSV data validation must pass before submission');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(selectedUserId, comments.trim());
      onClose();
    } catch (error) {
      console.error('Error submitting stage:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Submit Stage to {nextStageName}</DialogTitle>
          <DialogDescription>
            Submit the {getStageDisplayName(stageInfo.current_stage)} stage and assign to{' '}
            {nextStageName} persona
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Loading Quality Gate */}
          {isDeveloperStage && loadingQualityGate && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-gray-600">Running quality gate checks...</span>
            </div>
          )}

          {/* Quality Gate Results (Developer Stage Only) */}
          {isDeveloperStage && qualityGateResults && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-purple-600" />
                Quality Gate Results
              </h3>

              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Quality Score</p>
                    <p className={`text-2xl font-bold ${
                      qualityGateResults.quality_score >= 0.7 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(qualityGateResults.quality_score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={`mt-1 ${
                      qualityGateResults.can_proceed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {qualityGateResults.can_proceed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </div>

                {qualityGateResults.summary && (
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600">Total</p>
                      <p className="font-semibold text-gray-900">{qualityGateResults.summary.total_issues}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-600">Errors</p>
                      <p className="font-semibold text-red-800">{qualityGateResults.summary.errors}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-orange-600">Warnings</p>
                      <p className="font-semibold text-orange-800">{qualityGateResults.summary.warnings}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600">Info</p>
                      <p className="font-semibold text-blue-800">{qualityGateResults.summary.info}</p>
                    </div>
                  </div>
                )}

                {qualityGateResults.findings && qualityGateResults.findings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-300">
                    <p className="text-sm font-medium text-gray-900 mb-2">Top Issues:</p>
                    <ul className="space-y-1">
                      {qualityGateResults.findings.slice(0, 3).map((finding: any, index: number) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className={`mr-2 ${
                            finding.severity === 'error' ? 'text-red-500' :
                            finding.severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
                          }`}>•</span>
                          <span>{finding.message}</span>
                        </li>
                      ))}
                      {qualityGateResults.findings.length > 3 && (
                        <li className="text-sm text-gray-500 italic">
                          + {qualityGateResults.findings.length - 3} more issues
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CSV Validation Results (Developer Stage Only) */}
          {isDeveloperStage && csvValidationResults && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                CSV Data Validation
              </h3>

              <div className={`border rounded-lg p-4 ${
                csvValidationResults.is_valid
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-red-200 bg-red-50/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Actual vs Expected Data
                  </span>
                  <Badge className={
                    csvValidationResults.is_valid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }>
                    {csvValidationResults.is_valid ? 'Valid' : 'Issues Found'}
                  </Badge>
                </div>

                {csvValidationResults.variance_metrics && (
                  <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                    <div>
                      <p className="text-gray-600">Variance</p>
                      <p className="font-semibold">
                        {(csvValidationResults.variance_metrics.row_count_variance * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Actual Rows</p>
                      <p className="font-semibold">
                        {csvValidationResults.variance_metrics.row_count_actual}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Expected Rows</p>
                      <p className="font-semibold">
                        {csvValidationResults.variance_metrics.row_count_expected}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage Validation Status */}
          {validationResults && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Validation Status</h3>

              {validationResults.is_valid ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      All validation checks passed
                    </p>
                  </div>
                </Alert>
              ) : (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Validation errors found:
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {validationResults.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              )}

              {/* Warnings */}
              {validationResults.warnings.length > 0 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800 mb-2">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                      {validationResults.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              )}

              {/* Required Actions */}
              {validationResults.required_actions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">Required Actions:</p>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    {validationResults.required_actions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user-select" className="text-sm font-semibold">
              Assign to {nextStageName} User *
            </Label>
            <select
              id="user-select"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select a user...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email}){' '}
                  {user.role_name && `- ${user.role_name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm font-semibold">
              Submission Comments *
            </Label>
            <Textarea
              id="comments"
              placeholder={`Provide details about the ${getStageDisplayName(
                stageInfo.current_stage
              )} stage completion...\n\nMinimum 10 characters required.`}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isSubmitting}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {comments.length} / 10 minimum characters
            </p>
          </div>

          {/* Stage Progress Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Stage Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Current Stage:</span>
                <div className="font-medium mt-1">
                  {getStageDisplayName(stageInfo.current_stage)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Next Stage:</span>
                <div className="font-medium mt-1">{nextStageName}</div>
              </div>
              <div>
                <span className="text-gray-600">Steps Completed:</span>
                <div className="font-medium mt-1">
                  {stageInfo.stage_progress.steps_completed} /{' '}
                  {stageInfo.stage_progress.total_steps}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Completion:</span>
                <div className="font-medium mt-1">
                  {stageInfo.stage_progress.completion_percentage.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Form Errors */}
          {errors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following errors:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (validationResults && !validationResults.is_valid) ||
              (isDeveloperStage && qualityGateResults && !qualityGateResults.can_proceed) ||
              (isDeveloperStage && csvValidationResults && !csvValidationResults.is_valid) ||
              !stageInfo.can_submit ||
              loadingQualityGate
            }
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit to {nextStageName}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StageSubmitDialog;
