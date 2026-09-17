import axios from 'axios';

// Resolve API base URL with zero-config support for Vercel, Render, Netlify, and Localhost
export const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http')) return envUrl;

  // Auto-connect to live production FastAPI backend when deployed on Vercel, Render, or any remote domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal) {
      return 'https://darshanai-backend.onrender.com/api';
    }
  }

  return envUrl || '/api';
};

const API = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('darshanai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for 401 handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('darshanai_token');
      localStorage.removeItem('darshanai_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;