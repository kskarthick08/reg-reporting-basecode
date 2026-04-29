import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { llmConfigService, LLMConfig, LLMConfigCreate, LLMConfigUpdate, LLMConfigTestResponse, LLMProviderInfo } from '@/services/llmConfigService';
import { Plus, PlayCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';
import '../components/css/LLMConfigPage.css';

export const LLMConfigPage = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<LLMConfig | null>(null);
  const [providers, setProviders] = useState<LLMProviderInfo[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<LLMConfigTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<{ id: number; name: string } | null>(null);

  const [formData, setFormData] = useState({
    provider: 'azure_openai',
    name: '',
    api_endpoint: '',
    api_key: '',
    deployment_name: '',
    api_version: '',
    model_name: '',
    temperature: 0.3,
    max_tokens: 4000,
    top_p: 1.0,
  });

  useEffect(() => {
    fetchAllConfigs();
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await llmConfigService.getSupportedProviders();
      setProviders(data);
    } catch (err: any) {
      console.error('Failed to fetch providers:', err);
    }
  };

  const fetchAllConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const allConfigs = await llmConfigService.getAllConfigs();
      setConfigs(allConfigs);
      
      const active = allConfigs.find(c => c.is_active);
      if (active) {
        setCurrentConfig(active);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch LLM configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      const toastId = showToast.loading('Creating LLM configuration...');

      const createData: LLMConfigCreate = {
        provider: formData.provider,
        name: formData.name,
        api_key: formData.api_key,
        model_name: formData.model_name,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
        top_p: formData.top_p,
      };

      if (formData.api_endpoint) createData.api_endpoint = formData.api_endpoint;
      if (formData.deployment_name) createData.deployment_name = formData.deployment_name;
      if (formData.api_version) createData.api_version = formData.api_version;

      await llmConfigService.createConfig(createData);

      showToast.dismiss(toastId);
      showToast.success('LLM configuration created successfully!');
      setIsAdding(false);
      resetForm();
      await fetchAllConfigs();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to create LLM configuration';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentConfig) return;

    try {
      setLoading(true);
      setError(null);
      const toastId = showToast.loading('Updating LLM configuration...');

      const updateData: LLMConfigUpdate = {
        name: formData.name,
        model_name: formData.model_name,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
        top_p: formData.top_p,
      };

      if (formData.api_endpoint) updateData.api_endpoint = formData.api_endpoint;
      if (formData.deployment_name) updateData.deployment_name = formData.deployment_name;
      if (formData.api_version) updateData.api_version = formData.api_version;
      if (formData.api_key) updateData.api_key = formData.api_key;

      await llmConfigService.updateConfig(currentConfig.id, updateData);

      showToast.dismiss(toastId);
      showToast.success('LLM configuration updated successfully!');
      setIsEditing(false);
      await fetchAllConfigs();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to update LLM configuration';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (configId: number) => {
    try {
      setLoading(true);
      setError(null);
      const toastId = showToast.loading('Activating configuration...');

      await llmConfigService.activateConfig(configId);
      await fetchAllConfigs();

      showToast.dismiss(toastId);
      showToast.success('Configuration activated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to activate configuration';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (configId: number, configName: string) => {
    setConfigToDelete({ id: configId, name: configName });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!configToDelete) return;

    try {
      setLoading(true);
      setError(null);
      const toastId = showToast.loading('Deleting configuration...');

      await llmConfigService.deleteConfig(configToDelete.id);
      await fetchAllConfigs();

      showToast.dismiss(toastId);
      showToast.success('Configuration deleted successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete configuration';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setConfigToDelete(null);
    }
  };

  const handleTestConfig = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);
      const result = await llmConfigService.testConfig();
      setTestResult(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to test LLM configuration');
    } finally {
      setIsTesting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'azure_openai',
      name: '',
      api_endpoint: '',
      api_key: '',
      deployment_name: '',
      api_version: '',
      model_name: '',
      temperature: 0.3,
      max_tokens: 4000,
      top_p: 1.0,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    resetForm();
  };

  const handleEditConfig = (config: LLMConfig) => {
    setCurrentConfig(config);
    setFormData({
      provider: config.provider,
      name: config.name,
      api_endpoint: config.api_endpoint || '',
      api_key: '',
      deployment_name: config.deployment_name || '',
      api_version: config.api_version || '',
      model_name: config.model_name,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
    });
    setIsEditing(true);
  };

  const getProviderRequirements = () => {
    return providers.find(p => p.provider === formData.provider);
  };

  if (loading && configs.length === 0) {
    return (
      <div className="llm-page-container">
        <div className="llm-loading">
          <div className="llm-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="llm-page-container">
      <div className="llm-header-section">
        <div>
          <h1 className="llm-main-title">LLM Configuration</h1>
          <p className="llm-subtitle">
            Manage LLM providers and settings for the MCP system
          </p>
        </div>
        <div className="llm-actions-group">
          <Button onClick={() => setIsAdding(true)} variant="default" className="llm-add-btn">
            <Plus className="llm-icon-sm" />
            Add New LLM
          </Button>
          {currentConfig && (
            <Button onClick={handleTestConfig} disabled={isTesting} variant="outline" className="llm-test-btn">
              <PlayCircle className="llm-icon-sm" />
              {isTesting ? 'Testing...' : 'Test Active Config'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="llm-error-banner">
          {error}
        </div>
      )}

      {testResult && (
        <div className={`llm-test-result ${testResult.success ? 'llm-test-success' : 'llm-test-error'}`}>
          <div className="llm-test-result-title">
            Test Result: {testResult.success ? 'Success' : 'Failed'}
          </div>
          <div className="llm-test-result-content">
            {testResult.message}
            {testResult.response_content && (
              <>
                <br /><br />
                <strong>Response:</strong> {testResult.response_content}
              </>
            )}
            {testResult.execution_time && (
              <>
                <br />
                <strong>Execution Time:</strong> {testResult.execution_time.toFixed(2)}s
              </>
            )}
          </div>
        </div>
      )}

      {/* Configurations Table */}
      <div className="llm-table-card">
        <div className="llm-table-content">
          <div className="llm-table-wrapper">
            <table className="llm-table">
              <thead className="llm-table-head">
                <tr>
                  <th className="llm-th">Name</th>
                  <th className="llm-th">Provider</th>
                  <th className="llm-th">Model</th>
                  <th className="llm-th">Status</th>
                  <th className="llm-th">Actions</th>
                </tr>
              </thead>
              <tbody className="llm-table-body">
                {configs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="llm-empty-state">
                      <div className="llm-empty-text">No LLM configurations found. Add one to get started.</div>
                    </td>
                  </tr>
                ) : (
                  configs.map((config) => (
                    <tr key={config.id} className="llm-table-row">
                      <td className="llm-td">{config.name}</td>
                      <td className="llm-td">
                        <span className="llm-provider-badge">{config.provider}</span>
                      </td>
                      <td className="llm-td">{config.model_name}</td>
                      <td className="llm-td">
                        {config.is_active ? (
                          <span className="llm-status-badge llm-status-active">Active</span>
                        ) : (
                          <span className="llm-status-badge llm-status-inactive">Inactive</span>
                        )}
                      </td>
                      <td className="llm-td">
                        <div className="llm-actions">
                          {!config.is_active && (
                            <Button size="sm" variant="outline" onClick={() => handleActivate(config.id)} className="llm-action-btn">
                              Activate
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEditConfig(config)} className="llm-action-btn">
                            Edit
                          </Button>
                          {!config.is_active && (
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(config.id, config.name)} className="llm-action-btn">
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add New LLM Dialog */}
      {isAdding && (
        <div className="workflow-modal-overlay" onClick={() => setIsAdding(false)}>
          <div className="workflow-modal-container workflow-modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="workflow-modal-header">
              <h2 className="workflow-modal-title">Add New LLM Configuration</h2>
              <button className="workflow-modal-close" onClick={() => setIsAdding(false)}>
                <svg className="workflow-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="workflow-modal-body workflow-modal-body-scrollable">
              <div className="space-y-4 mt-4">
            <div className="llm-form-group">
              <Label htmlFor="provider" className="llm-form-label">LLM Provider *</Label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="llm-select"
              >
                {providers.map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.display_name} - {p.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="llm-form-group">
              <Label htmlFor="name" className="llm-form-label">Configuration Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., OpenAI GPT-4 Production"
                className="llm-input"
              />
            </div>

            {getProviderRequirements()?.requires_endpoint && (
              <div className="llm-form-group">
                <Label htmlFor="add_api_endpoint" className="llm-form-label">API Endpoint *</Label>
                <Input
                  id="add_api_endpoint"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  placeholder="https://api.example.com/"
                  className="llm-input"
                />
              </div>
            )}

            <div className="llm-form-group">
              <Label htmlFor="add_api_key" className="llm-form-label">API Key *</Label>
              <Input
                id="add_api_key"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Enter API key"
                className="llm-input"
              />
            </div>

            {getProviderRequirements()?.requires_deployment && (
              <div className="llm-form-group">
                <Label htmlFor="add_deployment_name" className="llm-form-label">Deployment Name *</Label>
                <Input
                  id="add_deployment_name"
                  value={formData.deployment_name}
                  onChange={(e) => setFormData({ ...formData, deployment_name: e.target.value })}
                  placeholder="e.g., gpt-4"
                  className="llm-input"
                />
              </div>
            )}

            {getProviderRequirements()?.requires_api_version && (
              <div className="llm-form-group">
                <Label htmlFor="add_api_version" className="llm-form-label">API Version *</Label>
                <Input
                  id="add_api_version"
                  value={formData.api_version}
                  onChange={(e) => setFormData({ ...formData, api_version: e.target.value })}
                  placeholder="e.g., 2024-02-01"
                  className="llm-input"
                />
              </div>
            )}

            <div className="llm-form-group">
              <Label htmlFor="add_model_name" className="llm-form-label">Model Name *</Label>
              <Input
                id="add_model_name"
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
                className="llm-input"
              />
            </div>

            <div className="llm-form-row">
              <div className="llm-form-group">
                <Label htmlFor="add_temperature" className="llm-form-label">Temperature</Label>
                <Input
                  id="add_temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="llm-input"
                />
              </div>

              <div className="llm-form-group">
                <Label htmlFor="add_max_tokens" className="llm-form-label">Max Tokens</Label>
                <Input
                  id="add_max_tokens"
                  type="number"
                  step="100"
                  min="100"
                  max="32000"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  className="llm-input"
                />
              </div>

              <div className="llm-form-group">
                <Label htmlFor="add_top_p" className="llm-form-label">Top P</Label>
                <Input
                  id="add_top_p"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.top_p}
                  onChange={(e) => setFormData({ ...formData, top_p: parseFloat(e.target.value) })}
                  className="llm-input"
                />
              </div>
            </div>

              </div>
            </div>
            <div className="workflow-modal-footer">
              <Button variant="outline" onClick={handleCancel} className="workflow-cancel-btn">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="workflow-submit-btn">
                {loading ? 'Creating...' : 'Create Configuration'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Configuration Dialog */}
      {isEditing && (
        <div className="workflow-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="workflow-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="workflow-modal-header">
              <h2 className="workflow-modal-title">Edit LLM Configuration</h2>
              <button className="workflow-modal-close" onClick={() => setIsEditing(false)}>
                <svg className="workflow-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="workflow-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="space-y-4 mt-4">
            <div className="llm-form-group">
              <Label htmlFor="edit_name" className="llm-form-label">Configuration Name *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., OpenAI GPT-4 Production"
                className="llm-input"
              />
            </div>

            {getProviderRequirements()?.requires_endpoint && (
              <div className="llm-form-group">
                <Label htmlFor="edit_api_endpoint" className="llm-form-label">API Endpoint</Label>
                <Input
                  id="edit_api_endpoint"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  placeholder="https://api.example.com/"
                  className="llm-input"
                />
              </div>
            )}

            <div className="llm-form-group">
              <Label htmlFor="edit_api_key" className="llm-form-label">API Key (leave empty to keep current)</Label>
              <Input
                id="edit_api_key"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Enter new API key"
                className="llm-input"
              />
            </div>

            {getProviderRequirements()?.requires_deployment && (
              <div className="llm-form-group">
                <Label htmlFor="edit_deployment_name" className="llm-form-label">Deployment Name</Label>
                <Input
                  id="edit_deployment_name"
                  value={formData.deployment_name}
                  onChange={(e) => setFormData({ ...formData, deployment_name: e.target.value })}
                  placeholder="e.g., gpt-4"
                  className="llm-input"
                />
              </div>
            )}

            {getProviderRequirements()?.requires_api_version && (
              <div className="llm-form-group">
                <Label htmlFor="edit_api_version" className="llm-form-label">API Version</Label>
                <Input
                  id="edit_api_version"
                  value={formData.api_version}
                  onChange={(e) => setFormData({ ...formData, api_version: e.target.value })}
                  placeholder="e.g., 2024-02-01"
                  className="llm-input"
                />
              </div>
            )}

            <div className="llm-form-group">
              <Label htmlFor="edit_model_name" className="llm-form-label">Model Name *</Label>
              <Input
                id="edit_model_name"
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
                className="llm-input"
              />
            </div>

            <div className="llm-form-row">
              <div className="llm-form-group">
                <Label htmlFor="edit_temperature" className="llm-form-label">Temperature</Label>
                <Input
                  id="edit_temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="llm-input"
                />
              </div>

              <div className="llm-form-group">
                <Label htmlFor="edit_max_tokens" className="llm-form-label">Max Tokens</Label>
                <Input
                  id="edit_max_tokens"
                  type="number"
                  step="100"
                  min="100"
                  max="32000"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  className="llm-input"
                />
              </div>

              <div className="llm-form-group">
                <Label htmlFor="edit_top_p" className="llm-form-label">Top P</Label>
                <Input
                  id="edit_top_p"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.top_p}
                  onChange={(e) => setFormData({ ...formData, top_p: parseFloat(e.target.value) })}
                  className="llm-input"
                />
              </div>
            </div>

              </div>
            </div>
            <div className="workflow-modal-footer">
              <Button variant="outline" onClick={handleCancel} className="workflow-cancel-btn">
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={loading} className="workflow-submit-btn">
                {loading ? 'Updating...' : 'Update Configuration'}
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
          setConfigToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Configuration"
        message={`Are you sure you want to delete the configuration "${configToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
