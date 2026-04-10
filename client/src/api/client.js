import axios from 'axios';

export const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';
const authStorageKey = 'sa_portal_token';

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 20000,
});

export function getStoredToken() {
  return window.localStorage.getItem(authStorageKey) || '';
}

export function setStoredToken(token) {
  if (token) {
    window.localStorage.setItem(authStorageKey, token);
  } else {
    window.localStorage.removeItem(authStorageKey);
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function withApiOrigin(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (apiBaseURL.startsWith('http')) {
    return `${apiBaseURL.replace(/\/api\/?$/, '')}${path}`;
  }
  return path;
}

export function getSocketOrigin() {
  if (apiBaseURL.startsWith('http')) {
    return apiBaseURL.replace(/\/api\/?$/, '');
  }
  return window.location.origin;
}
