import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  auth.restore();
  if (!auth.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login');
  }
});
