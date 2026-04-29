/**
 * WebSocket Service
 *
 * Handles real-time WebSocket connections for job progress updates
 */

type MessageHandler = (data: any) => void;

interface JobUpdate {
  type: string;
  job_id: string;
  job_type?: string;
  progress?: number;
  progress_message?: string;
  current_substep?: string;
  estimated_completion_time?: string;
  status?: string;
  result?: any;
  error?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  private subscribedJobIds: string[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;

    const wsUrl = this.getWebSocketUrl();
    const url = `${wsUrl}?token=${encodeURIComponent(token)}`;

    console.log('Connecting to WebSocket:', wsUrl);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Resubscribe to jobs after reconnection
        if (this.subscribedJobIds.length > 0) {
          this.subscribeToJobs(this.subscribedJobIds);
        }

        // Start ping interval
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.stopPingInterval();

        // Attempt reconnection if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopPingInterval();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribers.clear();
    this.subscribedJobIds = [];
  }

  /**
   * Subscribe to job updates
   */
  subscribeToJobs(jobIds: string[], callback?: MessageHandler): void {
    // Store job IDs for reconnection
    this.subscribedJobIds = Array.from(new Set([...this.subscribedJobIds, ...jobIds]));

    // Add callback if provided
    if (callback) {
      jobIds.forEach((jobId) => {
        if (!this.subscribers.has(jobId)) {
          this.subscribers.set(jobId, new Set());
        }
        this.subscribers.get(jobId)!.add(callback);
      });
    }

    // Send subscription message
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        action: 'subscribe',
        job_ids: jobIds,
      });
    }
  }

  /**
   * Unsubscribe from job updates
   */
  unsubscribeFromJobs(jobIds: string[], callback?: MessageHandler): void {
    // Remove from stored job IDs
    this.subscribedJobIds = this.subscribedJobIds.filter((id) => !jobIds.includes(id));

    // Remove callback if provided
    if (callback) {
      jobIds.forEach((jobId) => {
        this.subscribers.get(jobId)?.delete(callback);
        if (this.subscribers.get(jobId)?.size === 0) {
          this.subscribers.delete(jobId);
        }
      });
    } else {
      // Remove all callbacks for these jobs
      jobIds.forEach((jobId) => {
        this.subscribers.delete(jobId);
      });
    }

    // Send unsubscription message
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        action: 'unsubscribe',
        job_ids: jobIds,
      });
    }
  }

  /**
   * Subscribe to a specific job with callback
   */
  onJobUpdate(jobId: string, callback: MessageHandler): () => void {
    this.subscribeToJobs([jobId], callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromJobs([jobId], callback);
    };
  }

  /**
   * Get WebSocket URL from environment or current location
   */
  private getWebSocketUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Parse base URL to get host
    let wsHost = window.location.host;
    try {
      const url = new URL(baseUrl);
      wsHost = url.host;
    } catch (error) {
      console.warn('Failed to parse base URL, using current host');
    }

    return `${wsProtocol}//${wsHost}/api/tasks/ws/jobs`;
  }

  /**
   * Send message to WebSocket server
   */
  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    const { type, job_id } = data;

    // Handle different message types
    switch (type) {
      case 'connected':
        console.log('WebSocket connection confirmed:', data.user_id);
        break;

      case 'subscribed':
        console.log('Subscribed to jobs:', data.job_ids);
        break;

      case 'unsubscribed':
        console.log('Unsubscribed from jobs:', data.job_ids);
        break;

      case 'job_progress':
      case 'job_completed':
      case 'job_failed':
        // Notify subscribers for this job
        if (job_id && this.subscribers.has(job_id)) {
          this.subscribers.get(job_id)!.forEach((callback) => {
            try {
              callback(data as JobUpdate);
            } catch (error) {
              console.error('Error in job update callback:', error);
            }
          });
        }
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        console.error('WebSocket error message:', data.message);
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(token: string): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ action: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): string {
    if (!this.ws) return 'CLOSED';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
export type { JobUpdate, MessageHandler };
