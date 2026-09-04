import { defineStore } from 'pinia';

export interface AiprAuthState {
  accessToken: string | null;
  refreshToken: string | null;
}

export const useAiprStore = defineStore('aipr', {
  state: (): AiprAuthState => ({
    accessToken: sessionStorage.getItem('aipr_accessToken'),
    refreshToken: localStorage.getItem('aipr_refreshToken'),
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },
  actions: {
    setTokens(accessToken: string, refreshToken: string) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      sessionStorage.setItem('aipr_accessToken', accessToken);
      localStorage.setItem('aipr_refreshToken', refreshToken);
    },
    clearTokens() {
      this.accessToken = null;
      this.refreshToken = null;
      sessionStorage.removeItem('aipr_accessToken');
      localStorage.removeItem('aipr_refreshToken');
    },
  },
});
