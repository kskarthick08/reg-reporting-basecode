/**
 * Job Status Card Component
 *
 * Displays individual job status with real-time progress updates
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  Clock,
  Play,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import websocketService, { JobUpdate } from '@/services/websocketService';

interface JobStatusCardProps {
  jobId: string;
  jobType?: string;
  initialStatus?: string;
  initialProgress?: number;
  onCancel?: () => void;
  onRetry?: () => void;
  compact?: boolean;
}

export const JobStatusCard: React.FC<JobStatusCardProps> = ({
  jobId,
  jobType,
  initialStatus = 'queued',
  initialProgress = 0,
  onCancel,
  onRetry,
  compact = false,
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [progressMessage, setProgressMessage] = useState('');
  const [currentSubstep, setCurrentSubstep] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = websocketService.onJobUpdate(jobId, (update: JobUpdate) => {
      if (update.status) {
        setStatus(update.status);
      }
      if (typeof update.progress === 'number') {
        setProgress(update.progress);
      }
      if (update.progress_message) {
        setProgressMessage(update.progress_message);
      }
      if (update.current_substep) {
        setCurrentSubstep(update.current_substep);
      }
      if (update.estimated_completion_time) {
        setEstimatedCompletion(update.estimated_completion_time);
      }
      if (update.error) {
        setError(update.error);
      }
    });

    return () => unsubscribe();
  }, [jobId]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Play className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-gray-500" />;
      case 'cancelled':
        return <X className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    const badgeStyles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      queued: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={badgeStyles[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatETA = (isoString: string): string => {
    try {
      const eta = new Date(isoString);
      const now = new Date();
      const diff = Math.floor((eta.getTime() - now.getTime()) / 1000);

      if (diff < 0) return 'Soon';
      return formatDuration(diff);
    } catch {
      return 'N/A';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg bg-white hover:shadow-md hover:border-blue-300 transition-all">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">{jobType || 'Job'}</span>
            {getStatusBadge()}
          </div>
          {status === 'running' && (
            <div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{progress}%</span>
                <span>{formatDuration(elapsedTime)}</span>
              </div>
            </div>
          )}
          {progressMessage && (
            <p className="text-xs text-gray-600 mt-1 truncate">{progressMessage}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-white/90 backdrop-blur-sm border border-white/30 shadow-lg ${
      status === 'running' ? 'border-l-4 border-l-blue-500' :
      status === 'completed' ? 'border-l-4 border-l-green-500' :
      status === 'failed' ? 'border-l-4 border-l-red-500' : ''
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">{jobType || 'Job Execution'}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        {jobId && (
          <CardDescription className="text-xs font-mono">{jobId}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {status === 'running' && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-900">Progress</span>
              <span className="text-gray-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 bg-gray-200" />
          </div>
        )}

        {/* Progress Message */}
        {progressMessage && (
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            <span className="text-gray-700">{progressMessage}</span>
          </div>
        )}

        {/* Current Substep */}
        {currentSubstep && (
          <div className="text-sm">
            <span className="font-medium text-gray-900">Current Step: </span>
            <Badge className="bg-blue-100 text-blue-800">{currentSubstep}</Badge>
          </div>
        )}

        {/* Timing Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-900">Elapsed Time:</span>
            <p className="text-gray-600">{formatDuration(elapsedTime)}</p>
          </div>
          {estimatedCompletion && status === 'running' && (
            <div>
              <span className="font-medium text-gray-900">ETA:</span>
              <p className="text-gray-600">{formatETA(estimatedCompletion)}</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="border border-red-200 rounded-lg p-3 bg-red-50">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 text-sm">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(status === 'failed' || status === 'running') && (
          <div className="flex justify-end space-x-2 pt-2">
            {status === 'failed' && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
            {status === 'running' && onCancel && (
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobStatusCard;
