import { RouteRecordRaw } from 'vue-router';

// Adapting imports to point to views in the module
// Assuming this file is at src/modules/aviation/router/routes.ts
// Views are at ../views/ (which is src/modules/aviation/views)
// But to be safe with alias, we can use relative.

const routes: RouteRecordRaw[] = [
    {
        path: '/aviation',
        name: 'aviation-dashboard',
        component: () => import('../views/Dashboard.vue')
    },
    {
        path: '/aviation/topics',
        name: 'aviation-topics',
        component: () => import('../views/TopicsManagement.vue')
    },
    {
        path: '/aviation/weather',
        name: 'aviation-weather',
        component: () => import('../views/WeatherManagement.vue')
    },
    {
        path: '/aviation/backups',
        name: 'aviation-backups',
        component: () => import('../views/BackupsManagement.vue')
    }
];

export default routes;
