export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role?: Role;
  is_active?: boolean;
  is_superuser?: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface LLMConfig {
  model: string;
  temperature: number;
  max_tokens?: number;
}

export interface Document {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  upload_date: string;
  uploaded_by: string;
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  mapping_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;

  // Optional fields used by pages
  document_id?: string;
  status?: string;
  document_type?: string;
  created_at?: string;
  is_processed?: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'regulation' | 'metric' | 'attribute';
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}


export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, any>;
  timestamp: string;

  // Optional fields used by pages
  activity_type?: string;
  created_at?: string;
  username?: string;
  action_details?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  details?: any;
}

// Export workflow types
export * from './workflow';
