/**
 * Stage Configuration Page - Tile Layout
 *
 * Admin/Superuser only page for configuring validation rules for each workflow stage.
 * Controls validation requirements for BA, Developer, and Reviewer stages.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { toast } from 'react-hot-toast';
import {
  getConfiguration,
  updateConfiguration,
  resetConfiguration,
  type BAValidationConfig,
  type DeveloperValidationConfig,
  type ReviewerValidationConfig,
} from '@/services/stageConfigurationService';
import '@/components/css/StageConfigurationPage.css';

type StageName = 'business_analyst' | 'developer' | 'reviewer';

interface StageConfig {
  enabled: boolean;
  config: any;
  loading: boolean;
  saving: boolean;
}

export default function StageConfigurationPage() {
  const [baState, setBaState] = useState<StageConfig>({
    enabled: true,
    config: {
      allow_unresolved_missing_fields: false,
      allow_degraded_quality_analysis: false,
      minimum_document_coverage: 80,
      require_gap_analysis: true,
      require_test_cases: true,
      minimum_requirements_count: 5,
    },
    loading: false,
    saving: false,
  });

  const [devState, setDevState] = useState<StageConfig>({
    enabled: true,
    config: {
      required_sql_validation: true,
      required_report_xml_artifact: true,
      require_schema_analysis: true,
      require_lineage_builder: true,
      minimum_test_coverage: 70,
      require_deterministic_mapping: true,
    },
    loading: false,
    saving: false,
  });

  const [revState, setRevState] = useState<StageConfig>({
    enabled: true,
    config: {
      minimum_coverage_scores: 85,
      required_xsd_validation: true,
      required_rule_checks: true,
      require_anomaly_detection: true,
      require_variance_explanation: true,
      require_audit_pack: true,
    },
    loading: false,
    saving: false,
  });

  useEffect(() => {
    loadAllConfigurations();
  }, []);

  const loadAllConfigurations = async () => {
    try {
      // Load BA config
      setBaState(prev => ({ ...prev, loading: true }));
      const baData = await getConfiguration('business_analyst');
      setBaState(prev => ({
        ...prev,
        enabled: baData.is_validation_enabled,
        config: baData.validation_config,
        loading: false,
      }));

      // Load Developer config
      setDevState(prev => ({ ...prev, loading: true }));
      const devData = await getConfiguration('developer');
      setDevState(prev => ({
        ...prev,
        enabled: devData.is_validation_enabled,
        config: devData.validation_config,
        loading: false,
      }));

      // Load Reviewer config
      setRevState(prev => ({ ...prev, loading: true }));
      const revData = await getConfiguration('reviewer');
      setRevState(prev => ({
        ...prev,
        enabled: revData.is_validation_enabled,
        config: revData.validation_config,
        loading: false,
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load configurations');
      setBaState(prev => ({ ...prev, loading: false }));
      setDevState(prev => ({ ...prev, loading: false }));
      setRevState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSave = async (stageName: StageName) => {
    let state: StageConfig;
    let setState: React.Dispatch<React.SetStateAction<StageConfig>>;

    if (stageName === 'business_analyst') {
      state = baState;
      setState = setBaState;
    } else if (stageName === 'developer') {
      state = devState;
      setState = setDevState;
    } else {
      state = revState;
      setState = setRevState;
    }

    setState(prev => ({ ...prev, saving: true }));
    try {
      await updateConfiguration(stageName, {
        is_validation_enabled: state.enabled,
        validation_config: state.config,
      });

      toast.success('Configuration saved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleReset = async (stageName: StageName) => {
    if (!confirm('Are you sure you want to reset to default configuration?')) {
      return;
    }

    let setState: React.Dispatch<React.SetStateAction<StageConfig>>;

    if (stageName === 'business_analyst') {
      setState = setBaState;
    } else if (stageName === 'developer') {
      setState = setDevState;
    } else {
      setState = setRevState;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      await resetConfiguration(stageName);
      const data = await getConfiguration(stageName);
      setState({
        enabled: data.is_validation_enabled,
        config: data.validation_config,
        loading: false,
        saving: false,
      });
      toast.success('Configuration reset to defaults');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reset configuration');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const renderConfigTile = (
    title: string,
    stageName: StageName,
    state: StageConfig,
    setState: React.Dispatch<React.SetStateAction<StageConfig>>,
    configFields: React.ReactNode
  ) => {
    const titleColorClass = stageName === 'business_analyst' ? 'stage-config-title-ba' :
                            stageName === 'developer' ? 'stage-config-title-developer' :
                            'stage-config-title-reviewer';

    return (
      <Card className="stage-config-card">
        <CardHeader>
          <div className="stage-config-card-header-content">
            <div>
              <CardTitle className={titleColorClass}>{title}</CardTitle>
              <CardDescription>Configure validation rules and requirements</CardDescription>
            </div>
            <div className="stage-config-enable-validation">
              <Label>Enable Stage Validation</Label>
              <Checkbox
                checked={state.enabled}
                onCheckedChange={(checked) => setState(prev => ({ ...prev, enabled: !!checked }))}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="stage-config-card-content">
          {state.loading ? (
            <div className="stage-config-loading">
              <p>Loading configuration...</p>
            </div>
          ) : (
            <div className="stage-config-content-wrapper">
              <div className="stage-config-settings-section">
                <h3 className="stage-config-section-title">
                  {title.split(' ')[0]} Settings
                </h3>

                <div className="stage-config-fields-wrapper">
                  {configFields}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="stage-config-actions-wrapper">
                <Button
                  onClick={() => handleSave(stageName)}
                  disabled={state.saving}
                  className="stage-config-save-btn"
                >
                  {state.saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => handleReset(stageName)}
                  disabled={state.loading}
                  variant="outline"
                  className="stage-config-reset-btn"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="stage-config-container">
      {/* Header */}
      <div className="stage-config-header">
        <h1 className="stage-config-title">
          Stage Configuration
        </h1>
        <p className="stage-config-subtitle">
          Configure validation rules and requirements for each workflow stage
        </p>
      </div>

      {/* Tiles Grid */}
      <div className="stage-config-grid">
        {/* Business Analyst Tile */}
        {renderConfigTile(
          'Business Analyst Stage',
          'business_analyst',
          baState,
          setBaState,
          <>
            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Allow Unresolved Missing Fields</Label>
                <p className="stage-config-field-description">
                  Permit workflow submission with missing required fields
                </p>
              </div>
              <Checkbox
                checked={baState.config.allow_unresolved_missing_fields}
                onCheckedChange={(checked) =>
                  setBaState(prev => ({
                    ...prev,
                    config: { ...prev.config, allow_unresolved_missing_fields: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Allow Degraded Quality Analysis</Label>
                <p className="stage-config-field-description">
                  Allow submission even if quality checks don't meet standards
                </p>
              </div>
              <Checkbox
                checked={baState.config.allow_degraded_quality_analysis}
                onCheckedChange={(checked) =>
                  setBaState(prev => ({
                    ...prev,
                    config: { ...prev.config, allow_degraded_quality_analysis: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-slider-field">
              <Label className="stage-config-slider-label">
                Minimum Document Coverage: {baState.config.minimum_document_coverage}%
              </Label>
              <p className="stage-config-slider-description">
                Required percentage of document content that must be analyzed
              </p>
              <Slider
                value={[baState.config.minimum_document_coverage]}
                onValueChange={(value) =>
                  setBaState(prev => ({
                    ...prev,
                    config: { ...prev.config, minimum_document_coverage: value[0] },
                  }))
                }
                min={0}
                max={100}
                step={5}
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Gap Analysis</Label>
                <p className="stage-config-field-description">
                  Gap Analysis step must be completed before submission
                </p>
              </div>
              <Checkbox
                checked={baState.config.require_gap_analysis}
                onCheckedChange={(checked) =>
                  setBaState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_gap_analysis: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Test Cases</Label>
                <p className="stage-config-field-description">
                  Test Case Generator step must be completed
                </p>
              </div>
              <Checkbox
                checked={baState.config.require_test_cases}
                onCheckedChange={(checked) =>
                  setBaState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_test_cases: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-slider-field">
              <Label className="stage-config-slider-label">
                Minimum Requirements Count: {baState.config.minimum_requirements_count}
              </Label>
              <p className="stage-config-slider-description">
                Minimum number of structured requirements that must be generated
              </p>
              <Slider
                value={[baState.config.minimum_requirements_count]}
                onValueChange={(value) =>
                  setBaState(prev => ({
                    ...prev,
                    config: { ...prev.config, minimum_requirements_count: value[0] },
                  }))
                }
                min={1}
                max={50}
                step={1}
              />
            </div>
          </>
        )}

        {/* Developer Tile */}
        {renderConfigTile(
          'Developer Stage',
          'developer',
          devState,
          setDevState,
          <>
            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Required SQL Validation</Label>
                <p className="stage-config-field-description">
                  All generated SQL must pass syntax and semantic validation
                </p>
              </div>
              <Checkbox
                checked={devState.config.required_sql_validation}
                onCheckedChange={(checked) =>
                  setDevState(prev => ({
                    ...prev,
                    config: { ...prev.config, required_sql_validation: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Required Report XML Artifact</Label>
                <p className="stage-config-field-description">
                  Report XML artifact must be generated and validated
                </p>
              </div>
              <Checkbox
                checked={devState.config.required_report_xml_artifact}
                onCheckedChange={(checked) =>
                  setDevState(prev => ({
                    ...prev,
                    config: { ...prev.config, required_report_xml_artifact: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Schema Analysis</Label>
                <p className="stage-config-field-description">
                  Schema Analyzer step must be completed
                </p>
              </div>
              <Checkbox
                checked={devState.config.require_schema_analysis}
                onCheckedChange={(checked) =>
                  setDevState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_schema_analysis: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Lineage Builder</Label>
                <p className="stage-config-field-description">
                  Data lineage documentation must be created
                </p>
              </div>
              <Checkbox
                checked={devState.config.require_lineage_builder}
                onCheckedChange={(checked) =>
                  setDevState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_lineage_builder: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-slider-field">
              <Label className="stage-config-slider-label">
                Minimum Test Coverage: {devState.config.minimum_test_coverage}%
              </Label>
              <p className="stage-config-slider-description">
                Required code test coverage percentage
              </p>
              <Slider
                value={[devState.config.minimum_test_coverage]}
                onValueChange={(value) =>
                  setDevState(prev => ({
                    ...prev,
                    config: { ...prev.config, minimum_test_coverage: value[0] },
                  }))
                }
                min={0}
                max={100}
                step={5}
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Deterministic Mapping</Label>
                <p className="stage-config-field-description">
                  Source-to-target field mappings must be created
                </p>
              </div>
              <Checkbox
                checked={devState.config.require_deterministic_mapping}
                onCheckedChange={(checked) =>
                  setDevState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_deterministic_mapping: !!checked },
                  }))
                }
              />
            </div>
          </>
        )}

        {/* Reviewer Tile */}
        {renderConfigTile(
          'Reviewer Stage',
          'reviewer',
          revState,
          setRevState,
          <>
            <div className="stage-config-slider-field">
              <Label className="stage-config-slider-label">
                Minimum Coverage Scores: {revState.config.minimum_coverage_scores}%
              </Label>
              <p className="stage-config-slider-description">
                Minimum quality and compliance coverage score required
              </p>
              <Slider
                value={[revState.config.minimum_coverage_scores]}
                onValueChange={(value) =>
                  setRevState(prev => ({
                    ...prev,
                    config: { ...prev.config, minimum_coverage_scores: value[0] },
                  }))
                }
                min={0}
                max={100}
                step={5}
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Required XSD Validation</Label>
                <p className="stage-config-field-description">
                  All XML artifacts must pass XSD schema validation
                </p>
              </div>
              <Checkbox
                checked={revState.config.required_xsd_validation}
                onCheckedChange={(checked) =>
                  setRevState(prev => ({
                    ...prev,
                    config: { ...prev.config, required_xsd_validation: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Required Rule Checks</Label>
                <p className="stage-config-field-description">
                  All regulatory rule checks must pass
                </p>
              </div>
              <Checkbox
                checked={revState.config.required_rule_checks}
                onCheckedChange={(checked) =>
                  setRevState(prev => ({
                    ...prev,
                    config: { ...prev.config, required_rule_checks: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Anomaly Detection</Label>
                <p className="stage-config-field-description">
                  Anomaly Detection step must be completed
                </p>
              </div>
              <Checkbox
                checked={revState.config.require_anomaly_detection}
                onCheckedChange={(checked) =>
                  setRevState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_anomaly_detection: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Variance Explanation</Label>
                <p className="stage-config-field-description">
                  Variance Explanation step must be completed
                </p>
              </div>
              <Checkbox
                checked={revState.config.require_variance_explanation}
                onCheckedChange={(checked) =>
                  setRevState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_variance_explanation: !!checked },
                  }))
                }
              />
            </div>

            <div className="stage-config-field">
              <div>
                <Label className="stage-config-field-label">Require Audit Pack</Label>
                <p className="stage-config-field-description">
                  Audit Pack Generator step must be completed
                </p>
              </div>
              <Checkbox
                checked={revState.config.require_audit_pack}
                onCheckedChange={(checked) =>
                  setRevState(prev => ({
                    ...prev,
                    config: { ...prev.config, require_audit_pack: !!checked },
                  }))
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
