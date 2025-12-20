import { RouteRecordRaw } from 'vue-router';

// Adapting imports to point to views in the module
// Assuming this file is at src/modules/aviation/router/routes.ts
// Views are at ../views/ (which is src/modules/aviation/views)
// But to be safe with alias, we can use relative.

const routes: RouteRecordRaw[] = [
    {
        path: '/aviation',
        name: 'Aviation',
        meta: { icon: 'flight' },
        children: [
            {
                path: '',
                name: 'aviation-dashboard',
                component: () => import('@/views/aviation/Dashboard.vue'),
                meta: { icon: 'dashboard' }
            },
            {
                path: 'topics',
                name: 'aviation-topics',
                component: () => import('@/views/aviation/TopicsManagement.vue'),
                meta: { icon: 'topic' }
            },
            {
                path: 'weather',
                name: 'aviation-weather',
                component: () => import('@/views/aviation/WeatherManagement.vue'),
                meta: { icon: 'wb_cloudy' }
            },
            {
                path: 'backups',
                name: 'aviation-backups',
                component: () => import('@/views/aviation/BackupsManagement.vue'),
                meta: { icon: 'backup' }
            }
        ]
    }
];


export default routes;


