import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import TopicsManagement from '../views/TopicsManagement.vue';
import WeatherManagement from '../views/WeatherManagement.vue';
import BackupsManagement from '../views/BackupsManagement.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/topics',
      name: 'topics',
      component: TopicsManagement
    },
    {
      path: '/weather',
      name: 'weather',
      component: WeatherManagement
    },
    {
      path: '/backups',
      name: 'backups',
      component: BackupsManagement
    }
  ]
});

export default router;




