import api from '@/utils/axios';
import { Document, ChatMessage } from '@/types';

export const documentService = {
  getAll: async (): Promise<Document[]> => {
    const response = await api.get<{ documents: Document[]; count: number }>('/documents');
    return response.data.documents;
  },

  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  vectorize: async (id: string): Promise<{ message: string }> => {
    const response = await api.post(`/documents/vectorize/${id}`);
    return response.data;
  },

  getEmbeddingStatus: async (id: string): Promise<{ status: string }> => {
    const response = await api.get(`/documents/${id}/embedding-status`);
    return response.data;
  },

  chat: async (documentId: string, message: string): Promise<ChatMessage> => {
    const response = await api.post<ChatMessage>(`/documents/${documentId}/chat`, { message });
    return response.data;
  },

  getChatHistory: async (documentId: string): Promise<ChatMessage[]> => {
    const response = await api.get<ChatMessage[]>(`/documents/${documentId}/chat-history`);
    return response.data;
  },

  getStats: async (): Promise<{
    total_files: number;
    vectorized_files: number;
    uploaded_files: number;
    total_size_bytes: number;
    total_size_formatted: string;
  }> => {
    const response = await api.get('/documents/stats');
    return response.data;
  },
};
