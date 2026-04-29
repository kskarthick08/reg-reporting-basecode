/**
 * StepResultDisplay Component
 *
 * Reusable component for displaying workflow step results.
 * Handles various result formats (JSON, Markdown, tables, etc.)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { showToast } from '@/lib/toast';
// import ReactMarkdown from 'react-markdown'; // Optional dependency

interface StepResultDisplayProps {
  stepName: string;
  result: any;
  showMetrics?: boolean;
  collapsible?: boolean;
  onDownload?: () => void;
}

export const StepResultDisplay: React.FC<StepResultDisplayProps> = ({
  stepName,
  result,
  showMetrics = true,
  collapsible = false,
  onDownload
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = () => {
    const textToCopy = typeof result === 'string'
      ? result
      : JSON.stringify(result, null, 2);

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    showToast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    // Handle markdown content
    if (result.report_content || result.markdown_content) {
      const content = result.report_content || result.markdown_content;
      return (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
          {content}
        </div>
      );
    }

    // Handle structured JSON
    if (typeof result === 'object') {
      return (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
    }

    // Handle plain text
    return (
      <div className="whitespace-pre-wrap text-sm">
        {result}
      </div>
    );
  };

  const getSuccessStatus = () => {
    if (typeof result === 'object') {
      return result.success !== false;
    }
    return true;
  };

  const getMetrics = () => {
    if (typeof result !== 'object') return null;

    return {
      tokens: result.tokens_used || result.total_tokens_used,
      executionTime: result.execution_time_ms,
      model: result.model_used
    };
  };

  const metrics = getMetrics();
  const isSuccess = getSuccessStatus();

  return (
    <Card className="animate-in slide-in-from-bottom-4 duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {stepName} Results
              <Badge variant={isSuccess ? 'default' : 'destructive'}>
                {isSuccess ? 'Success' : 'Failed'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Step execution completed at {new Date().toLocaleString()}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {showMetrics && metrics && (
          <div className="flex gap-4 mt-3 text-sm text-gray-600">
            {metrics.tokens && (
              <div>
                <span className="font-medium">Tokens:</span> {metrics.tokens.toLocaleString()}
              </div>
            )}
            {metrics.executionTime && (
              <div>
                <span className="font-medium">Time:</span> {(metrics.executionTime / 1000).toFixed(2)}s
              </div>
            )}
            {metrics.model && (
              <div>
                <span className="font-medium">Model:</span> {metrics.model}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          {renderContent()}
        </CardContent>
      )}
    </Card>
  );
};
