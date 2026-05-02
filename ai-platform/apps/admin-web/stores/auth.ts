import { defineStore } from 'pinia';

interface Admin { id: string; email: string; role: string; }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken:  null as string | null,
    refreshToken: null as string | null,
    admin:        null as Admin | null,
  }),

  getters: {
    isLoggedIn: (s) => !!s.accessToken,
    authHeader: (s) => s.accessToken ? `Bearer ${s.accessToken}` : '',
  },

  actions: {
    setTokens(access: string, refresh: string) {
      this.accessToken  = access;
      this.refreshToken = refresh;
      if (import.meta.client) {
        sessionStorage.setItem('access_token',  access);
        sessionStorage.setItem('refresh_token', refresh);
      }
    },
    restore() {
      if (!import.meta.client) return;
      this.accessToken  = sessionStorage.getItem('access_token');
      this.refreshToken = sessionStorage.getItem('refresh_token');
    },
    logout() {
      this.accessToken = this.refreshToken = this.admin = null;
      if (import.meta.client) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
      }
    },
  },
});
