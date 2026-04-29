import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
}

// Helper function to safely parse user from localStorage
const loadUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    return null;
  }
};

// Initialize state from localStorage
const initializeAuth = () => {
  const token = localStorage.getItem('token');
  const user = loadUserFromStorage();
  
  // Only consider authenticated if both token AND user exist
  const isAuthenticated = !!(token && user);
  
  // If we have a token but no user (inconsistent state), clear the token
  if (token && !user) {
    localStorage.removeItem('token');
    return { user: null, token: null, isAuthenticated: false };
  }
  
  return { user, token, isAuthenticated };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initializeAuth(),
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));
