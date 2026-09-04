import axios from 'axios';
import { useAiprStore } from '../store/aipr-store';
import router from '@/router';

const api = axios.create({
  baseURL: '/api/aipr',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const store = useAiprStore();
    if (store.accessToken) {
      config.headers.Authorization = `Bearer ${store.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const store = useAiprStore();
    if (error.response && error.response.status === 401) {
      store.clearTokens();
      router.push({ name: 'aipr-login' });
    }
    const message = error.response?.data?.message || 'Error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
