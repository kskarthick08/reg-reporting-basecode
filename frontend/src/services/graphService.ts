import api from '@/utils/axios';
import { GraphData } from '@/types';

export const graphService = {
  getGraphData: async (): Promise<GraphData> => {
    const response = await api.get<GraphData>('/graph');
    return response.data;
  },

  getNodeDetails: async (nodeId: string): Promise<any> => {
    const response = await api.get(`/graph/nodes/${nodeId}`);
    return response.data;
  },

  getRelationships: async (nodeId: string): Promise<any[]> => {
    const response = await api.get(`/graph/nodes/${nodeId}/relationships`);
    return response.data;
  },

  searchNodes: async (query: string): Promise<any[]> => {
    const response = await api.get(`/graph/search`, { params: { q: query } });
    return response.data;
  },
};
