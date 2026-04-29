import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { documentService } from '@/services/documentService';
import { Document } from '@/types';
import { formatDate, formatFileSize } from '@/utils/formatters';
import { showToast } from '@/lib/toast';
import '@/components/css/DocumentManagementPage.css';

export const DocumentManagementPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; filename: string } | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await documentService.getAll();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await documentService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const toastId = showToast.loading(`Uploading "${file.name}"...`);

    try {
      await documentService.upload(file);
      await fetchDocuments();
      await fetchStats();
      showToast.dismiss(toastId);
      showToast.success(`Document "${file.name}" uploaded successfully!`);
      // Reset the input so the same file can be uploaded again
      event.target.value = '';
    } catch (error) {
      console.error('Failed to upload document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast.dismiss(toastId);
      showToast.error(`Failed to upload: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVectorize = async (docId: string) => {
    setLoading(true);
    const toastId = showToast.loading('Vectorizing document...');

    try {
      await documentService.vectorize(docId);
      // Refresh documents list to update status
      await fetchDocuments();
      await fetchStats();
      showToast.dismiss(toastId);
      showToast.success('Document vectorized successfully!');
    } catch (error) {
      console.error('Failed to vectorize document:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to vectorize document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (docId: string, filename: string) => {
    setDocToDelete({ id: docId, filename });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;

    setLoading(true);
    const toastId = showToast.loading(`Deleting "${docToDelete.filename}"...`);

    try {
      await documentService.delete(docToDelete.id);
      await fetchDocuments();
      await fetchStats();
      showToast.dismiss(toastId);
      showToast.success(`Document "${docToDelete.filename}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to delete document. Please try again.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    }
  };

  const handleChatOpen = (doc: Document) => {
    setSelectedDoc(doc);
    setChatOpen(true);
    setChatHistory([]);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedDoc || chatLoading) return;

    const userMessage = { role: 'user', content: chatMessage };
    setChatHistory([...chatHistory, userMessage]);
    setChatMessage('');
    setChatLoading(true);

    try {
      const response = await documentService.chat(selectedDoc.id, userMessage.content);
      const content = (response as any).response || (response as any).answer || 'No response';
      setChatHistory((prev) => [...prev, { role: 'assistant', content }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'uploaded': return 'document-status-success';
      case 'processing': return 'document-status-warning';
      case 'failed': return 'document-status-error';
      default: return 'document-status-default';
    }
  };

  return (
    <div className="document-page-container">
      <div className="document-header-section">
        <div>
          <h1 className="document-main-title">Document Management</h1>
          <p className="document-subtitle">Upload, manage, and chat with your documents</p>
        </div>
        <div className="document-upload-btn-wrapper">
          <Button 
            className="document-upload-btn" 
            disabled={loading}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <svg className="document-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {loading ? 'Uploading...' : 'Upload Document'}
          </Button>
          <input
            id="file-upload-input"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            disabled={loading}
            className="document-upload-input-hidden"
          />
        </div>
      </div>

      {loading && (
        <div className="document-progress-bar">
          <div className="document-progress-fill"></div>
        </div>
      )}

      {/* Statistics Section */}
      {stats && (
        <div className="document-stats-section">
          <div className="document-stat-card">
            <div className="document-stat-icon document-stat-icon-blue">
              <svg className="document-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="document-stat-content">
              <div className="document-stat-value">{stats.total_files}</div>
              <div className="document-stat-label">Total Files</div>
            </div>
          </div>
          <div className="document-stat-card">
            <div className="document-stat-icon document-stat-icon-green">
              <svg className="document-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="document-stat-content">
              <div className="document-stat-value">{stats.vectorized_files}</div>
              <div className="document-stat-label">Vectorized</div>
            </div>
          </div>
          <div className="document-stat-card">
            <div className="document-stat-icon document-stat-icon-orange">
              <svg className="document-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="document-stat-content">
              <div className="document-stat-value">{stats.uploaded_files}</div>
              <div className="document-stat-label">Uploaded Only</div>
            </div>
          </div>
          <div className="document-stat-card">
            <div className="document-stat-icon document-stat-icon-purple">
              <svg className="document-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div className="document-stat-content">
              <div className="document-stat-value">{stats.total_size_formatted}</div>
              <div className="document-stat-label">Total Size</div>
            </div>
          </div>
        </div>
      )}

      <Card className="document-table-card">
        <CardContent className="document-table-content">
          <div className="document-table-wrapper">
            <table className="document-table">
              <thead className="document-table-head">
                <tr>
                  <th className="document-th">File Name</th>
                  <th className="document-th">Size</th>
                  <th className="document-th">Status</th>
                  <th className="document-th">Type</th>
                  <th className="document-th">Uploaded</th>
                  <th className="document-th">Actions</th>
                </tr>
              </thead>
              <tbody className="document-table-body">
                {documents.map((doc) => (
                  <tr key={doc.document_id || doc.id} className="document-table-row">
                    <td className="document-td document-filename">
                      <svg className="document-file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {doc.filename}
                    </td>
                    <td className="document-td">{formatFileSize(doc.file_size)}</td>
                    <td className="document-td">
                      <span className={`document-status-badge ${getStatusBadgeClass(doc.status || 'uploaded')}`}>
                        {doc.status || 'uploaded'}
                      </span>
                    </td>
                    <td className="document-td">{doc.document_type || 'N/A'}</td>
                    <td className="document-td">
                      {doc.created_at ? formatDate(doc.created_at) : 'N/A'}
                    </td>
                    <td className="document-td">
                      <div className="document-action-buttons-wrapper">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="document-action-btn document-action-preview"
                          title="Preview document details"
                        >
                          <svg className="document-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleVectorize(doc.document_id || doc.id)}
                          disabled={loading || doc.is_processed}
                          className={`document-action-btn ${doc.is_processed ? 'document-action-vectorized' : 'document-action-vectorize'}`}
                          title={doc.is_processed ? "Already vectorized" : "Vectorize document for GraphRAG"}
                        >
                          <svg className="document-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleChatOpen(doc)}
                          disabled={!doc.is_processed}
                          className={`document-action-btn document-action-chat ${!doc.is_processed ? 'document-action-disabled' : ''}`}
                          title={doc.is_processed ? "Chat with document" : "Vectorize document first"}
                        >
                          <svg className="document-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(doc.document_id || doc.id, doc.filename)}
                          disabled={loading}
                          className="document-action-btn document-action-delete"
                          title="Delete document and remove from GraphRAG"
                        >
                          <svg className="document-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {documents.length === 0 && (
              <div className="document-empty-state">
                <svg className="document-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="document-empty-text">No documents uploaded yet</p>
                <p className="document-empty-subtext">Upload your first document to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="document-dialog-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="document-dialog-panel document-preview-dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="document-dialog-header">
              <div>
                <h2 className="document-dialog-title">Document Details</h2>
                <p className="document-dialog-filename">{previewDoc.filename}</p>
              </div>
              <button className="document-close-btn" onClick={() => setPreviewDoc(null)}>
                <svg className="document-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="document-preview-content">
              <div className="document-preview-fields">
                <div className="document-preview-field-row">
                  <span className="document-preview-field-label">File Size:</span>
                  <span className="document-preview-field-value">{formatFileSize(previewDoc.file_size)}</span>
                </div>
                <div className="document-preview-field-row">
                  <span className="document-preview-field-label">Type:</span>
                  <span className="document-preview-field-value">{previewDoc.document_type || 'N/A'}</span>
                </div>
                <div className="document-preview-field-row">
                  <span className="document-preview-field-label">Status:</span>
                  <span className={`document-status-badge ${getStatusBadgeClass(previewDoc.status || 'uploaded')}`}>
                    {previewDoc.status || 'uploaded'}
                  </span>
                </div>
                <div className="document-preview-field-row">
                  <span className="document-preview-field-label">Vectorized:</span>
                  <span className="document-preview-field-value">{previewDoc.is_processed ? '✓ Yes' : '✗ No'}</span>
                </div>
                <div className="document-preview-field-row">
                  <span className="document-preview-field-label">Uploaded:</span>
                  <span className="document-preview-field-value">
                    {previewDoc.created_at ? formatDate(previewDoc.created_at) : 'N/A'}
                  </span>
                </div>
                {previewDoc.metadata && (
                  <div className="document-metadata-container">
                    <span className="document-metadata-label">Metadata:</span>
                    <pre className="document-metadata-content">
                      {JSON.stringify(previewDoc.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatOpen && (
        <div className="document-dialog-overlay" onClick={() => setChatOpen(false)}>
          <div className="document-dialog-panel document-chat-dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="document-dialog-header">
              <div>
                <h2 className="document-dialog-title">Chat with Document</h2>
                <p className="document-dialog-filename">{selectedDoc?.filename}</p>
              </div>
              <button className="document-close-btn" onClick={() => setChatOpen(false)}>
                <svg className="document-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="document-chat-messages document-chat-messages-container">
              {chatHistory.length === 0 ? (
                <div className="document-chat-empty">
                  <svg className="document-chat-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="document-chat-empty-text">Ask a question about this document</p>
                  <div className="document-chat-suggestions">
                    <button
                      onClick={() => setChatMessage('What is this document about?')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        color: '#1e293b'
                      }}
                    >
                      What is this document about?
                    </button>
                    <button
                      onClick={() => setChatMessage('Summarize the key points')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        color: '#1e293b'
                      }}
                    >
                      Summarize the key points
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        marginBottom: '1.5rem',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {msg.role === 'assistant' && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div style={{
                        maxWidth: '70%',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: msg.role === 'user' ? '#3b82f6' : '#f1f5f9',
                        color: msg.role === 'user' ? 'white' : '#1e293b',
                        fontSize: '0.875rem',
                        lineHeight: '1.6'
                      }}>
                        {msg.content}
                      </div>
                      {msg.role === 'user' && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: '#f1f5f9',
                        fontSize: '0.875rem'
                      }}>
                        <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Thinking...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="document-chat-input-wrapper document-chat-input-border">
              <Input
                type="text"
                placeholder="Ask a question about this document..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !chatLoading && handleSendMessage()}
                className="document-chat-input"
                disabled={chatLoading}
              />
              <Button onClick={handleSendMessage} className="document-send-btn" disabled={chatLoading || !chatMessage.trim()}>
                <svg className="document-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDocToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        message={`Are you sure you want to delete "${docToDelete?.filename}"? This will remove the file and all associated data from GraphRAG. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
