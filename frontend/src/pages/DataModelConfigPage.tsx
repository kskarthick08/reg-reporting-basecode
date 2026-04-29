import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import {
  uploadDataModel,
  getDataModels,
  getDataModelDetail,
  updateDataModel,
  deleteDataModel,
  getDataModelStats,
  DataModel,
  DataModelDetail,
  DataModelStats,
} from '../services/dataModelService';
import {
  Database,
  FileText,
  Upload,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Key,
  Link2,
  Building2,
  FileType,
  Layers,
  Loader2,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import '../components/css/DataModelConfigPage.css';

const DataModelConfigPage: React.FC = () => {
  const [models, setModels] = useState<DataModel[]>([]);
  const [stats, setStats] = useState<DataModelStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 12;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedModel, setSelectedModel] = useState<DataModelDetail | null>(null);
  const [modelToDelete, setModelToDelete] = useState<{ id: number; name: string } | null>(null);
  
  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    version: '1.0',
    description: '',
    model_type: 'physical',
    domain: '',
    tags: '',
  });
  
  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    domain: '',
    tags: '',
  });
  
  // Detail view
  const [activeTab, setActiveTab] = useState<'overview' | 'tables'>('overview');
  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadModels();
    loadStats();
  }, [currentPage, searchTerm, statusFilter, domainFilter]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await getDataModels(
        currentPage * limit,
        limit,
        statusFilter || undefined,
        domainFilter || undefined,
        searchTerm || undefined
      );
      setModels(response.models);
      setTotal(response.total);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data models');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getDataModelStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast.error('Please select a file');
      return;
    }

    setLoading(true);
    const toastId = showToast.loading('Uploading data model...');

    try {
      const response = await uploadDataModel(
        uploadFile,
        uploadForm.name,
        uploadForm.version,
        uploadForm.description,
        uploadForm.model_type,
        uploadForm.domain,
        uploadForm.tags
      );

      // Display success message with keys information
      let successMsg = 'Data model uploaded successfully!';
      if (response.keys_info) {
        successMsg += ` Found ${response.keys_info.total_primary_keys} PK(s) and ${response.keys_info.total_foreign_keys} FK(s) across ${response.keys_info.total_tables} table(s).`;
      }

      showToast.dismiss(toastId);
      showToast.success(successMsg);

      setShowUploadModal(false);
      resetUploadForm();
      loadModels();
      loadStats();
    } catch (err: any) {
      showToast.dismiss(toastId);
      const errorMsg = err.response?.data?.detail || 'Failed to upload data model';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadForm({
      name: '',
      version: '1.0',
      description: '',
      model_type: 'physical',
      domain: '',
      tags: '',
    });
  };

  const handleViewDetail = async (modelId: number) => {
    try {
      setLoading(true);
      const detail = await getDataModelDetail(modelId);
      console.log('Model Detail:', detail);
      console.log('Tables:', detail.tables);
      if (detail.tables && detail.tables.length > 0) {
        console.log('First table:', detail.tables[0]);
        console.log('First table fields:', detail.tables[0].fields);
        console.log('Fields count:', detail.tables[0].fields?.length);
      }
      setSelectedModel(detail);
      setShowDetailModal(true);
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load model details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model: DataModel) => {
    setEditForm({
      name: model.name,
      description: model.description || '',
      status: model.status,
      domain: model.domain || '',
      tags: model.tags?.join(', ') || '',
    });
    setSelectedModel(model as any);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    try {
      setLoading(true);
      await updateDataModel(selectedModel.id, editForm);
      setSuccess('Data model updated successfully!');
      setShowEditModal(false);
      loadModels();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update data model');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (modelId: number, modelName: string) => {
    setModelToDelete({ id: modelId, name: modelName });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!modelToDelete) return;

    setLoading(true);
    const toastId = showToast.loading('Deleting data model...');

    try {
      await deleteDataModel(modelToDelete.id);
      showToast.dismiss(toastId);
      showToast.success('Data model deleted successfully!');
      loadModels();
      loadStats();
    } catch (err: any) {
      showToast.dismiss(toastId);
      const errorMsg = err.response?.data?.detail || 'Failed to delete data model';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setModelToDelete(null);
    }
  };

  const toggleTableExpand = (tableId: number) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId);
    } else {
      newExpanded.add(tableId);
    }
    setExpandedTables(newExpanded);
  };

  const getStatusClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: 'status-active',
      draft: 'status-draft',
      deprecated: 'status-deprecated',
      archived: 'status-archived',
    };
    return statusMap[status] || 'status-active';
  };

  return (
    <div className="data-model-config-container">
      {/* Header */}
      <div className="data-model-header-section">
        <h1 className="data-model-page-title">Data Model Configuration</h1>
        <p className="data-model-page-subtitle">Upload and manage data models with comprehensive metadata and version control</p>
      </div>
      <div className="data-model-actions">
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Data Model
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="alert-close-btn">×</button>
        </div>
      )}
      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess(null)} className="alert-close-btn">×</button>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="data-model-stats">
          <div className="stat-card">
            <h3>Total Models</h3>
            <div className="stat-value">{stats.total_models}</div>
          </div>
          <div className="stat-card">
            <h3>Total Tables</h3>
            <div className="stat-value">{stats.total_tables}</div>
          </div>
          <div className="stat-card">
            <h3>Total Fields</h3>
            <div className="stat-value">{stats.total_fields}</div>
          </div>
          <div className="stat-card">
            <h3>Active Models</h3>
            <div className="stat-value">{stats.by_status.active || 0}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="data-model-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
          />
        </div>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={domainFilter}
            onChange={(e) => {
              setDomainFilter(e.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="">All Domains</option>
            <option value="Customer">Customer</option>
            <option value="Finance">Finance</option>
            <option value="Risk">Risk</option>
            <option value="Operations">Operations</option>
          </select>
        </div>
      </div>

      {/* Model Grid */}
      {loading && !models.length ? (
        <div className="loading">Loading...</div>
      ) : models.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Database className="w-16 h-16 text-gray-400" />
          </div>
          <h3>No Data Models Found</h3>
          <p>Get started by uploading your first data model</p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Data Model
          </Button>
        </div>
      ) : (
        <>
          <div className="data-model-grid">
            {models.map((model) => (
              <div
                key={model.id}
                className="data-model-card"
                onClick={() => handleViewDetail(model.id)}
              >
                <div className="model-card-header">
                  <div className="model-card-title">
                    <h3>{model.name}</h3>
                    <div className="model-card-version">v{model.version}</div>
                  </div>
                  <div className="model-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="icon-button"
                      onClick={() => handleEdit(model)}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => handleDeleteClick(model.id, model.name)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {model.description && (
                  <div className="model-card-description">
                    {model.description.length > 100
                      ? `${model.description.substring(0, 100)}...`
                      : model.description}
                  </div>
                )}

                <div className="model-card-meta">
                  <div className="meta-item">
                    <span className={`status-badge ${getStatusClass(model.status)}`}>
                      {model.status}
                    </span>
                  </div>
                  {model.domain && (
                    <div className="meta-item">
                      <Building2 className="w-4 h-4" />
                      <span>{model.domain}</span>
                    </div>
                  )}
                  <div className="meta-item">
                    <Layers className="w-4 h-4" />
                    <span>{model.table_count || 0} tables</span>
                  </div>
                  <div className="meta-item">
                    <Key className="w-4 h-4" />
                    <span>{model.primary_key_count || 0} PKs</span>
                  </div>
                  <div className="meta-item">
                    <Link2 className="w-4 h-4" />
                    <span>{model.foreign_key_count || 0} FKs</span>
                  </div>
                  <div className="meta-item">
                    <FileType className="w-4 h-4" />
                    <span>{model.source_file_type}</span>
                  </div>
                </div>

                {model.tags && model.tags.length > 0 && (
                  <div className="model-card-tags">
                    {model.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage + 1} of {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={(currentPage + 1) * limit >= total}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Data Model</h2>
              <button
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div className={`modal-body ${loading ? 'modal-body-disabled' : ''}`}>
                <div className="form-group">
                  <label>File *</label>
                  <div
                    className="file-upload-area"
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => !loading && document.getElementById('file-input')?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <div>Drag and drop or click to browse</div>
                    <div className="field-description-text">
                      Supported: Excel (.xlsx, .xls), CSV, JSON, XSD
                    </div>
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    className="file-input"
                    accept=".xlsx,.xls,.csv,.json,.xsd"
                    onChange={handleFileChange}
                  />
                  {uploadFile && (
                    <div className="file-selected">
                      <FileText className="w-4 h-4 mr-2" />
                      <span>{uploadFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Model Name *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.name}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Version *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.version}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, version: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Model Type</label>
                  <select
                    value={uploadForm.model_type}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, model_type: e.target.value })
                    }
                  >
                    <option value="physical">Physical</option>
                    <option value="logical">Logical</option>
                    <option value="conceptual">Conceptual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Domain</label>
                  <input
                    type="text"
                    value={uploadForm.domain}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, domain: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, tags: e.target.value })
                    }
                    placeholder="e.g., finance, customer, reporting"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <Button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="button-secondary"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedModel && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Data Model</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Model Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="deprecated">Deprecated</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Domain</label>
                  <input
                    type="text"
                    value={editForm.domain}
                    onChange={(e) =>
                      setEditForm({ ...editForm, domain: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tags: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <Button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="button-secondary"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedModel && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedModel.name}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="model-detail-tabs">
                <button
                  className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`tab-button ${activeTab === 'tables' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tables')}
                >
                  Tables & Fields
                </button>
              </div>

              {activeTab === 'overview' && (
                <div>
                  <div className="form-group">
                    <label>Version</label>
                    <div>{selectedModel.version}</div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <div>{selectedModel.description || 'No description provided'}</div>
                  </div>
                  <div className="form-group">
                    <label>Model Type</label>
                    <div>{selectedModel.model_type}</div>
                  </div>
                  <div className="form-group">
                    <label>Domain</label>
                    <div>{selectedModel.domain || 'Not specified'}</div>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <div>
                      <span className={`status-badge ${getStatusClass(selectedModel.status)}`}>
                        {selectedModel.status}
                      </span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Source File</label>
                    <div>{selectedModel.source_file_name} ({selectedModel.source_file_type})</div>
                  </div>
                  <div className="form-group">
                    <label>Keys Summary</label>
                    <div className="stats-wrapper">
                      <div className="stat-card-blue">
                        <Key className="w-4 h-4 text-blue-600" />
                        <strong>Primary Keys:</strong>
                        <span>{
                          selectedModel.tables?.reduce((sum, table) =>
                            sum + table.fields.filter(f => f.is_primary_key).length, 0
                          ) || 0
                        }</span>
                      </div>
                      <div className="stat-card-yellow">
                        <Link2 className="w-4 h-4 text-yellow-600" />
                        <strong>Foreign Keys:</strong>
                        <span>{
                          selectedModel.tables?.reduce((sum, table) =>
                            sum + table.fields.filter(f => f.is_foreign_key).length, 0
                          ) || 0
                        }</span>
                      </div>
                      <div className="stat-card-indigo">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <strong>Tables with PKs:</strong>
                        <span>{
                          selectedModel.tables?.filter(table =>
                            table.fields.some(f => f.is_primary_key)
                          ).length || 0
                        } / {selectedModel.tables?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Tags</label>
                    <div className="model-card-tags">
                      {selectedModel.tags && selectedModel.tags.length > 0 ? (
                        selectedModel.tags.map((tag, idx) => (
                          <span key={idx} className="tag">{tag}</span>
                        ))
                      ) : (
                        'No tags'
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tables' && (
                <div className="table-list">
                  {selectedModel.tables && selectedModel.tables.length > 0 ? (
                    selectedModel.tables.map((table) => (
                      <div key={table.id} className="table-item">
                        <div
                          className="table-header"
                          onClick={() => toggleTableExpand(table.id)}
                        >
                          <div>
                            <h4>{table.table_name}</h4>
                            <div className="field-metadata">
                              {table.fields.filter(f => f.is_primary_key).length > 0 && (
                                <span className="field-metadata-item">
                                  <Key className="w-3 h-3" />
                                  {table.fields.filter(f => f.is_primary_key).length} PK(s)
                                </span>
                              )}
                              {table.fields.filter(f => f.is_foreign_key).length > 0 && (
                                <span className="field-metadata-item">
                                  <Link2 className="w-3 h-3" />
                                  {table.fields.filter(f => f.is_foreign_key).length} FK(s)
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="field-count">
                            {table.field_count} fields {expandedTables.has(table.id) ? <ChevronUp className="w-4 h-4 inline ml-1" /> : <ChevronDown className="w-4 h-4 inline ml-1" />}
                          </span>
                        </div>
                        {expandedTables.has(table.id) && (
                          <div>
                            {table.fields && table.fields.length > 0 ? (
                              <table className="fields-table">
                                <thead>
                                  <tr>
                                    <th>Field Name</th>
                                    <th>Data Type</th>
                                    <th>Nullable</th>
                                    <th>Keys</th>
                                    <th>Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.fields.map((field) => (
                                    <tr key={field.id}>
                                      <td><strong>{field.field_name}</strong></td>
                                      <td>
                                        {field.data_type}
                                        {field.length && ` (${field.length})`}
                                        {field.precision && ` (${field.precision},${field.scale})`}
                                      </td>
                                      <td>{field.is_nullable ? 'Yes' : 'No'}</td>
                                      <td>
                                        <div className="constraint-badges">
                                          {field.is_primary_key && (
                                            <span className="pk-badge">PK</span>
                                          )}
                                          {field.is_foreign_key && (
                                            <span className="fk-badge">FK</span>
                                          )}
                                          {!field.is_primary_key && !field.is_foreign_key && '-'}
                                        </div>
                                      </td>
                                      <td className="constraint-description">
                                        {field.description || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="empty-relationships">
                                No fields found for this table
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div>No tables found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setModelToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Data Model"
        message={`Are you sure you want to delete "${modelToDelete?.name}"? This action cannot be undone and will remove all associated tables, fields, and relationships.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default DataModelConfigPage;
