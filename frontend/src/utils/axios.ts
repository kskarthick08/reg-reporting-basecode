import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const configuredBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: configuredBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiBasePath = (baseURL?: string): string => {
  if (!baseURL) return '';
  try {
    return new URL(baseURL, window.location.origin).pathname.replace(/\/+$/, '');
  } catch {
    return baseURL.replace(/\/+$/, '');
  }
};

const baseWithoutApiPath = (baseURL?: string): string => {
  if (!baseURL) return '';
  const basePath = apiBasePath(baseURL);
  if (!basePath.endsWith('/api')) return baseURL;

  if (/^https?:\/\//i.test(baseURL)) {
    const parsed = new URL(baseURL);
    parsed.pathname = basePath.slice(0, -4) || '/';
    return parsed.toString().replace(/\/$/, '');
  }

  const trimmed = baseURL.replace(/\/+$/, '');
  return trimmed.slice(0, -4) || '';
};

api.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const basePath = apiBasePath(config.baseURL);

    if (basePath.endsWith('/api') && url.startsWith('/api/')) {
      config.url = url.slice(4);
    }

    if (basePath.endsWith('/api') && url.startsWith('/v1/')) {
      config.baseURL = baseWithoutApiPath(config.baseURL);
    }

    // Try to get token from store first, fallback to localStorage
    const token = useAuthStore.getState().token || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || localStorage.getItem('adminApiKey');
    if (adminKey) {
      config.headers['x-admin-key'] = adminKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
