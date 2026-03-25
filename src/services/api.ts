const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== 'undefined' && envUrl !== '') {
    return envUrl;
  }
  return 'https://c-production-fba1.up.railway.app';
};

const API_BASE_URL = getApiBaseUrl();

export const api = {
  baseUrl: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  getAuthHeader: () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};