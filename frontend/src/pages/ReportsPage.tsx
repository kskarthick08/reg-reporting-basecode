import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  ClipboardList,
  ClipboardCheck
} from 'lucide-react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import '@/components/css/DocumentManagementPage.css';
import '@/components/css/WorkflowMainPage.css';
import '@/components/css/ReportsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface GapSummary {
  total_gaps: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}

interface Creator {
  id: string;
  username: string;
  email: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  source_document: string;
  target_document: string;
  created_at: string;
  published_at: string;
  created_by: Creator;
  gap_summary: GapSummary;
  recommendations_count: number;
  workflow_id: string | null;
  session_name: string;
  report_type?: 'gap_analysis' | 'requirements' | 'test_cases';
}

interface ReportDetails extends Report {
  report_format: string;
  report_content: string;
  is_published: boolean;
  gap_details: any[];
  recommendations: any[];
  agent_info: {
    agent_name: string;
    model_used: string;
    provider: string;
    tokens_used: number;
    execution_time_ms: number;
  };
  workflow_info: {
    workflow_id: string | null;
    session_id: string;
    session_name: string;
  };
}

export const ReportsPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'gap_analysis' | 'requirements' | 'test_cases'>('all');

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Fetch Gap Analysis reports
      const gapResponse = await axios.get(`${API_BASE_URL}/api/ba/gap-analysis-reports/published`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const gapReports = (gapResponse.data.reports || []).map((r: Report) => ({
        ...r,
        report_type: 'gap_analysis' as const
      }));

      // Sort by published date (newest first)
      const allReports = gapReports.sort((a: Report, b: Report) => {
        const dateA = new Date(a.published_at || a.created_at || 0).getTime();
        const dateB = new Date(b.published_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setReports(allReports);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError(err.response?.data?.detail || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem('token');

      // Use Gap Analysis endpoint
      const endpoint = `${API_BASE_URL}/api/ba/gap-analysis-reports/${reportId}`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedReport(response.data);
      setViewDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to fetch report details:', err);
      showToast.error(err.response?.data?.detail || 'Failed to load report details');
    }
  };

  const handleDownloadReport = async (report: Report, format: 'markdown' | 'json') => {
    if (!report.workflow_id) {
      showToast.error('Cannot download: Workflow ID not available');
      return;
    }

    try {
      setDownloadingId(report.id);
      const toastId = showToast.loading(`Downloading ${format.toUpperCase()} report...`);

      const token = localStorage.getItem('token');

      // Use Gap Analysis endpoint
      const downloadEndpoint = `${API_BASE_URL}/api/ba/${report.workflow_id}/gap-analysis-report/download?format=${format}`;

      const response = await axios.get(
        downloadEndpoint,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const extension = format === 'json' ? 'json' : 'md';
      const filename = `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${extension}`;
      link.setAttribute('download', filename);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast.dismiss(toastId);
      showToast.success(`Report downloaded successfully as ${extension.toUpperCase()}`);
    } catch (err: any) {
      console.error('Failed to download report:', err);
      showToast.error(err.response?.data?.detail || 'Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  const getSeverityBadge = (severity: string, count: number) => {
    if (count === 0) return null;

    const config = {
      critical: { color: 'document-status-error', icon: AlertCircle },
      high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      medium: { color: 'document-status-warning', icon: Info },
      low: { color: 'bg-blue-100 text-blue-800', icon: Info },
      informational: { color: 'document-status-default', icon: CheckCircle2 }
    };

    const { color, icon: Icon } = config[severity as keyof typeof config] || config.informational;

    return (
      <span className={`document-status-badge ${color}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
        <Icon className="w-3 h-3" />
        {count} {severity}
      </span>
    );
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'gap_analysis':
        return <FileText className="document-icon-sm" />;
      case 'requirements':
        return <ClipboardList className="document-icon-sm" />;
      case 'test_cases':
        return <ClipboardCheck className="document-icon-sm" />;
      default:
        return <FileText className="document-icon-sm" />;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'gap_analysis':
        return 'Gap Analysis';
      case 'requirements':
        return 'Requirements Document';
      case 'test_cases':
        return 'Test Cases';
      default:
        return 'Report';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredReports = filterType === 'all'
    ? reports
    : reports.filter(r => r.report_type === filterType);

  const gapReportsCount = reports.length;
  const totalGaps = reports.reduce((sum, r) => sum + (r.gap_summary?.total_gaps || 0), 0);
  const totalRecommendations = reports.reduce((sum, r) => sum + (r.recommendations_count || 0), 0);

  if (loading) {
    return (
      <div className="document-page-container">
        <div className="document-progress-bar">
          <div className="document-progress-fill"></div>
        </div>
        <div className="document-empty-state">
          <div className="document-empty-icon">
            <RefreshCw className="w-full h-full animate-spin" />
          </div>
          <p className="document-empty-text">Loading Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-page-container">
      {/* Header */}
      <div className="document-header-section">
        <div>
          <h1 className="document-main-title">Published Reports</h1>
          <p className="document-subtitle">View and download workflow reports</p>
        </div>
        <Button onClick={fetchAllReports} disabled={loading} className="document-upload-btn">
          <RefreshCw className={`document-icon-sm ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="document-stats-section">
        <div className="document-stat-card">
          <div className="document-stat-icon reports-stat-icon-blue">
            <FileText />
          </div>
          <div className="document-stat-content">
            <div className="document-stat-value">{reports.length}</div>
            <div className="document-stat-label">Total Reports</div>
          </div>
        </div>

        <div className="document-stat-card">
          <div className="document-stat-icon reports-stat-icon-green">
            <FileText />
          </div>
          <div className="document-stat-content">
            <div className="document-stat-value">{gapReportsCount}</div>
            <div className="document-stat-label">Gap Analysis</div>
          </div>
        </div>

        <div className="document-stat-card">
          <div className="document-stat-icon reports-stat-icon-purple">
            <AlertCircle />
          </div>
          <div className="document-stat-content">
            <div className="document-stat-value">{totalGaps}</div>
            <div className="document-stat-label">Total Gaps</div>
          </div>
        </div>

        <div className="document-stat-card">
          <div className="document-stat-icon reports-stat-icon-orange">
            <CheckCircle2 />
          </div>
          <div className="document-stat-content">
            <div className="document-stat-value">{totalRecommendations}</div>
            <div className="document-stat-label">Recommendations</div>
          </div>
        </div>
      </div>


      {/* Reports Table */}
      <Card className="document-table-card">
        <CardContent className="document-table-content">
          {filteredReports.length === 0 ? (
            <div className="document-empty-state">
              <FileText className="document-empty-icon" />
              <p className="document-empty-text">No reports available</p>
              <p className="document-empty-subtext">
                {filterType === 'all'
                  ? 'Reports will appear here once they are published from workflows.'
                  : `No ${getReportTypeLabel(filterType)} reports found.`}
              </p>
            </div>
          ) : (
            <div className="document-table-wrapper">
              <table className="document-table">
                <thead className="document-table-head">
                  <tr>
                    <th className="document-th">Report Name</th>
                    <th className="document-th">Type</th>
                    <th className="document-th">Gap Summary</th>
                    <th className="document-th">Published By</th>
                    <th className="document-th">Published At</th>
                    <th className="document-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="document-table-body">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="document-table-row">
                      <td className="document-td">
                        <div className="document-filename">
                          <FileText className="document-file-icon" />
                          <div>
                            <div className="reports-title-wrapper">{report.title}</div>
                            <div className="reports-description-text">
                              {report.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="document-td">
                        <span className="document-status-badge document-status-default">
                          {getReportTypeLabel(report.report_type || 'gap_analysis')}
                        </span>
                      </td>
                      <td className="document-td">
                        {report.report_type === 'gap_analysis' && report.gap_summary ? (
                          <div className="reports-gap-summary-wrapper">
                            <span className="document-status-badge document-status-default">
                              Total: {report.gap_summary.total_gaps}
                            </span>
                            {report.gap_summary.critical > 0 && (
                              <span className="document-status-badge document-status-error">
                                {report.gap_summary.critical} Critical
                              </span>
                            )}
                            {report.gap_summary.high > 0 && (
                              <span className="document-status-badge document-status-warning">
                                {report.gap_summary.high} High
                              </span>
                            )}
                            {report.recommendations_count > 0 && (
                              <span className="document-status-badge document-status-success">
                                {report.recommendations_count} Recs
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="document-status-badge document-status-default">N/A</span>
                        )}
                      </td>
                      <td className="document-td">
                        <div className="reports-user-wrapper">
                          <User className="document-icon-xs" />
                          <span>{report.created_by.username}</span>
                        </div>
                      </td>
                      <td className="document-td">
                        <div className="reports-date-wrapper">
                          <Calendar className="document-icon-xs" />
                          <span>{formatDate(report.published_at)}</span>
                        </div>
                      </td>
                      <td className="document-td">
                        <div className="reports-actions-wrapper">
                          <button
                            onClick={() => handleViewReport(report.id)}
                            className="document-action-btn document-action-preview"
                            title="View Report"
                          >
                            <Eye className="document-icon-xs" />
                          </button>
                          <button
                            onClick={() => handleDownloadReport(report, 'markdown')}
                            disabled={downloadingId === report.id}
                            className="document-action-btn document-action-vectorize"
                            title="Download Report"
                          >
                            <Download className="document-icon-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      {viewDialogOpen && selectedReport && (
        <div className="wfp-modal-overlay" onClick={() => setViewDialogOpen(false)}>
          <div
            className="wfp-modal-container reports-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wfp-modal-header">
              <div>
                <h2 className="wfp-modal-title">{selectedReport.title}</h2>
                <p className="reports-modal-subtitle">
                  {selectedReport.description}
                </p>
              </div>
              <button className="wfp-modal-close" onClick={() => setViewDialogOpen(false)}>
                <svg className="wfp-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="wfp-modal-body">
              {/* Report Content Preview */}
              <div className="reports-content-preview">
                <pre className="reports-content-preview-text">
                  {selectedReport.report_content.substring(0, 2000)}
                  {selectedReport.report_content.length > 2000 && '...\n\n[Download full report to see more]'}
                </pre>
              </div>

              {/* Gap Summary Badges */}
              {selectedReport.gap_summary && (
                <div className="reports-gap-summary-section">
                  <label className="wfp-form-label">Gap Summary</label>
                  <div className="reports-gap-summary-badges">
                    <span className="gap-badge gap-badge-total">
                      Total: {selectedReport.gap_summary.total_gaps}
                    </span>
                    {selectedReport.gap_summary.critical > 0 && (
                      <span className="gap-badge gap-badge-critical">
                        Critical: {selectedReport.gap_summary.critical}
                      </span>
                    )}
                    {selectedReport.gap_summary.high > 0 && (
                      <span className="gap-badge gap-badge-high">
                        High: {selectedReport.gap_summary.high}
                      </span>
                    )}
                    {selectedReport.gap_summary.medium > 0 && (
                      <span className="gap-badge gap-badge-medium">
                        Medium: {selectedReport.gap_summary.medium}
                      </span>
                    )}
                    {selectedReport.gap_summary.low > 0 && (
                      <span className="gap-badge gap-badge-low">
                        Low: {selectedReport.gap_summary.low}
                      </span>
                    )}
                    {selectedReport.recommendations_count > 0 && (
                      <span className="gap-badge gap-badge-recommendations">
                        Recommendations: {selectedReport.recommendations_count}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Agent Info */}
              <div className="reports-agent-info-section">
                <label className="wfp-form-label">Agent Information</label>
                <div className="reports-agent-info-grid">
                  <div>
                    <strong className="reports-agent-info-strong">Agent:</strong> {selectedReport.agent_info.agent_name}
                  </div>
                  <div>
                    <strong className="reports-agent-info-strong">Model:</strong> {selectedReport.agent_info.model_used || 'N/A'}
                  </div>
                  <div>
                    <strong className="reports-agent-info-strong">Provider:</strong> {selectedReport.agent_info.provider || 'N/A'}
                  </div>
                  {selectedReport.agent_info.tokens_used > 0 && (
                    <div>
                      <strong className="reports-agent-info-strong">Tokens Used:</strong> {selectedReport.agent_info.tokens_used.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="wfp-modal-footer">
              <Button
                onClick={() => setViewDialogOpen(false)}
                className="wfp-cancel-btn"
              >
                Close
              </Button>
              <Button
                onClick={() => selectedReport?.workflow_info?.workflow_id && handleDownloadReport(selectedReport as Report, 'markdown')}
                disabled={!selectedReport?.workflow_info?.workflow_id && !selectedReport?.workflow_id}
                className="reports-download-btn-blue"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Markdown
              </Button>
              <Button
                onClick={() => (selectedReport?.workflow_info?.workflow_id || selectedReport?.workflow_id) && handleDownloadReport(selectedReport as Report, 'json')}
                disabled={!selectedReport?.workflow_info?.workflow_id && !selectedReport?.workflow_id}
                className="reports-download-btn-green"
              >
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
