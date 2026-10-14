import axios from 'axios';
import { supabase } from '../lib/supabase';

// Create axios instance with base configuration
// Logged-in requests are authenticated with a Supabase Auth token (see the request interceptor)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 300000, // 5 minutes: one message can need several Mistral calls (60 s each, with retries and fallback)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Logged-in requests carry the Supabase access token (supabase-js refreshes it before it expires)
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session) config.headers.Authorization = `Bearer ${data.session.access_token}`;
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // The session check on page load gets a 401 for every guest: that only means "not logged in"
    const isSessionCheck = error.config?.url === '/user/session';
    if (error.response?.status === 401 && !isSessionCheck) {
      // Handle unauthorized - redirect to login (but not if already on login/signup page)
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// The backend's message (e.g. "Username already taken"), or the fallback
export const apiErrorMessage = (error: unknown, fallback: string): string =>
  (axios.isAxiosError(error) && error.response?.data?.error) || fallback;

export default api;
