import { create } from 'zustand';
import { GraphData } from '@/types';

interface GraphState {
  graphData: GraphData | null;
  loading: boolean;
  selectedNode: string | null;
  setGraphData: (data: GraphData) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graphData: null,
  loading: false,
  selectedNode: null,
  setGraphData: (data) => set({ graphData: data }),
  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
  setLoading: (loading) => set({ loading }),
}));
