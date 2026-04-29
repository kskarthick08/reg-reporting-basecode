/**
 * CSV Data Manager Component
 *
 * Manages uploaded CSV files with list, preview, validation, and download features
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import CSVUploadDialog from './CSVUploadDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CSVFile {
  file_id: string;
  file_name: string;
  file_size: number;
  column_names: string[];
  row_count: number;
  is_valid: boolean;
  validation_errors: string[] | null;
  description: string;
  uploaded_at: string;
}

interface CSVDataManagerProps {
  workflowId: string;
}

export const CSVDataManager: React.FC<CSVDataManagerProps> = ({ workflowId }) => {
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CSVFile | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    loadFiles();
  }, [workflowId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/developer/workflows/${workflowId}/csv-files`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load CSV files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load CSV files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: CSVFile) => {
    try {
      const response = await fetch(
        `/api/developer/workflows/${workflowId}/csv-files/${file.file_id}/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast.success('File downloaded successfully');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to download file');
    }
  };

  const handleDelete = async (file: CSVFile) => {
    if (!confirm(`Are you sure you want to delete ${file.file_name}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/developer/workflows/${workflowId}/csv-files/${file.file_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      showToast.success('File deleted successfully');
      loadFiles();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete file');
    }
  };

  const handlePreview = async (file: CSVFile) => {
    try {
      const response = await fetch(
        `/api/developer/workflows/${workflowId}/csv-files/${file.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load file details');
      }

      const data = await response.json();
      setSelectedFile(data);
      setPreviewDialogOpen(true);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load file details');
    }
  };

  const handleValidate = async () => {
    const actualFile = files.find((f) => f.file_name.includes('actual'));
    const expectedFile = files.find((f) => f.file_name.includes('expected'));

    if (!actualFile || !expectedFile) {
      showToast.error('Both actual and expected files are required for validation');
      return;
    }

    try {
      setValidating(true);
      const response = await fetch(
        `/api/developer/workflows/${workflowId}/validate-csv?actual_file_id=${actualFile.file_id}&expected_file_id=${expectedFile.file_id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const data = await response.json();
      setValidationResult(data);

      if (data.is_valid) {
        showToast.success(`Validation passed with score: ${(data.quality_score * 100).toFixed(0)}%`);
      } else {
        showToast.warning(`Validation completed with issues. Score: ${(data.quality_score * 100).toFixed(0)}%`);
      }
    } catch (error: any) {
      showToast.error(error.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CSV Data Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading files...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CSV Data Files</CardTitle>
              <CardDescription>
                Upload and manage actual vs expected data files for Step 7
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadFiles}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setUploadDialogOpen(true)}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No CSV files uploaded yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Columns</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.file_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-blue-500" />
                          {file.file_name}
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.file_size)}</TableCell>
                      <TableCell>{file.column_names?.length || 0}</TableCell>
                      <TableCell>{file.row_count || 0}</TableCell>
                      <TableCell>
                        {file.is_valid ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Issues
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(file.uploaded_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(file)}
                            className="hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            className="hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file)}
                            className="hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {files.length >= 2 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleValidate}
                    disabled={validating}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    {validating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Validate Actual vs Expected
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Validation Result */}
              {validationResult && (
                <div className="mt-4 border border-blue-200 rounded-lg p-4 bg-blue-50/50 backdrop-blur-sm">
                  <h4 className="font-medium mb-2 text-gray-900">Validation Result</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Quality Score:</strong>{' '}
                      <span
                        className={
                          validationResult.quality_score >= 0.7
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }
                      >
                        {(validationResult.quality_score * 100).toFixed(0)}%
                      </span>
                    </p>
                    <p>
                      <strong>Status:</strong>{' '}
                      {validationResult.is_valid ? (
                        <Badge className="bg-green-100 text-green-800">
                          Passed
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Failed</Badge>
                      )}
                    </p>
                    {validationResult.findings?.length > 0 && (
                      <div>
                        <strong>Issues Found:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {validationResult.findings.map((finding: any, index: number) => (
                            <li key={index} className="text-gray-700">
                              {finding.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationResult.variance_metrics && (
                      <div>
                        <strong>Variance Metrics:</strong>
                        <ul className="list-disc list-inside mt-1">
                          <li>Row Count Variance: {(validationResult.variance_metrics.row_count_variance * 100).toFixed(1)}%</li>
                          <li>Columns (Actual): {validationResult.variance_metrics.column_count_actual}</li>
                          <li>Columns (Expected): {validationResult.variance_metrics.column_count_expected}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <CSVUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        workflowId={workflowId}
        onUploadSuccess={loadFiles}
      />

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>CSV File Preview</DialogTitle>
            <DialogDescription>
              {selectedFile?.file_name}
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>File Size:</strong> {formatFileSize(selectedFile.file_size)}
                </div>
                <div>
                  <strong>Rows:</strong> {selectedFile.row_count}
                </div>
                <div>
                  <strong>Columns:</strong> {selectedFile.column_names?.length || 0}
                </div>
                <div>
                  <strong>Uploaded:</strong> {formatDate(selectedFile.uploaded_at)}
                </div>
              </div>

              {selectedFile.column_names && (
                <div>
                  <strong className="text-sm">Column Names:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFile.column_names.map((col, index) => (
                      <Badge key={index} variant="outline">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedFile.validation_errors && selectedFile.validation_errors.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <strong className="text-red-800">Validation Errors:</strong>
                  <ul className="list-disc list-inside mt-2 text-sm text-red-700">
                    {selectedFile.validation_errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CSVDataManager;
