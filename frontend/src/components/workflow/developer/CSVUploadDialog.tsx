/**
 * CSV Upload Dialog Component
 *
 * Handles CSV file upload for Developer Workflow Step 7
 * Supports actual vs expected data file uploads with validation
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showToast } from '@/lib/toast';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
  onUploadSuccess: () => void;
}

interface UploadState {
  file: File | null;
  fileType: 'actual' | 'expected';
  description: string;
  uploading: boolean;
  validating: boolean;
  preview: any | null;
  errors: string[];
}

export const CSVUploadDialog: React.FC<CSVUploadDialogProps> = ({
  open,
  onClose,
  workflowId,
  onUploadSuccess,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    fileType: 'actual',
    description: '',
    uploading: false,
    validating: false,
    preview: null,
    errors: [],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        setUploadState((prev) => ({
          ...prev,
          errors: ['Only CSV files are supported'],
        }));
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setUploadState((prev) => ({
          ...prev,
          errors: ['File size exceeds 50MB limit'],
        }));
        return;
      }

      setUploadState((prev) => ({
        ...prev,
        file,
        errors: [],
      }));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setUploadState((prev) => ({
          ...prev,
          errors: ['Only CSV files are supported'],
        }));
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setUploadState((prev) => ({
          ...prev,
          errors: ['File size exceeds 50MB limit'],
        }));
        return;
      }

      setUploadState((prev) => ({
        ...prev,
        file,
        errors: [],
      }));
    }
  }, []);

  const handleUpload = async () => {
    if (!uploadState.file) {
      showToast.error('Please select a file');
      return;
    }

    setUploadState((prev) => ({ ...prev, uploading: true, errors: [] }));

    try {
      const formData = new FormData();
      formData.append('file', uploadState.file);
      formData.append('file_type', uploadState.fileType);
      if (uploadState.description) {
        formData.append('description', uploadState.description);
      }

      const response = await fetch(
        `/api/developer/workflows/${workflowId}/upload-csv`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const data = await response.json();

      // Show validation results
      if (data.is_valid) {
        showToast.success('CSV file uploaded successfully');
        setUploadState((prev) => ({ ...prev, preview: data }));
      } else {
        showToast.warning('CSV file uploaded with validation warnings');
        setUploadState((prev) => ({
          ...prev,
          preview: data,
          errors: data.validation_errors || [],
        }));
      }

      // Call success callback
      onUploadSuccess();

      // Close dialog after 2 seconds
      setTimeout(() => {
        onClose();
        resetState();
      }, 2000);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to upload CSV');
      setUploadState((prev) => ({
        ...prev,
        errors: [error.message || 'Upload failed'],
      }));
    } finally {
      setUploadState((prev) => ({ ...prev, uploading: false }));
    }
  };

  const resetState = () => {
    setUploadState({
      file: null,
      fileType: 'actual',
      description: '',
      uploading: false,
      validating: false,
      preview: null,
      errors: [],
    });
  };

  const handleClose = () => {
    if (!uploadState.uploading) {
      resetState();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload CSV Data File</DialogTitle>
          <DialogDescription>
            Upload actual or expected data file for PSD validation (Step 7)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Type Selection */}
          <div>
            <Label htmlFor="file-type">File Type</Label>
            <Select
              value={uploadState.fileType}
              onValueChange={(value) => {
                const fileType = value === 'expected' ? 'expected' : 'actual';
                setUploadState((prev) => ({ ...prev, fileType }));
              }}
              disabled={uploadState.uploading}
            >
              <SelectTrigger id="file-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual">Actual Data</SelectItem>
                <SelectItem value="expected">Expected Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Area */}
          <div>
            <Label>CSV File</Label>
            <div
              className="border-2 border-dashed border-blue-200 rounded-lg p-8 bg-blue-50/50 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {uploadState.file ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium">{uploadState.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Maximum file size: 50MB
                  </p>
                </div>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadState.uploading}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={uploadState.description}
              onChange={(e) =>
                setUploadState((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Add notes about this data file..."
              rows={3}
              disabled={uploadState.uploading}
            />
          </div>

          {/* Preview */}
          {uploadState.preview && (
            <div className={`border rounded-lg p-4 ${uploadState.preview.is_valid ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
              <h4 className="font-medium mb-2 flex items-center">
                {uploadState.preview.is_valid ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                )}
                Upload Preview
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Columns:</strong> {uploadState.preview.column_names?.length || 0}
                </p>
                <p>
                  <strong>Rows:</strong> {uploadState.preview.row_count || 0}
                </p>
                {uploadState.preview.column_names && (
                  <p>
                    <strong>Column Names:</strong>{' '}
                    {uploadState.preview.column_names.slice(0, 5).join(', ')}
                    {uploadState.preview.column_names.length > 5 && '...'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {uploadState.errors.length > 0 && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-800 mb-2 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Validation Errors
              </h4>
              <ul className="list-disc list-inside text-sm text-red-700">
                {uploadState.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploadState.uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!uploadState.file || uploadState.uploading}
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          >
            {uploadState.uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVUploadDialog;
