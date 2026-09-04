import { RouteRecordRaw } from 'vue-router';

// Adapting imports to point to views in the module
// Assuming this file is at src/modules/aviation/router/routes.ts
// Views are at ../views/ (which is src/modules/aviation/views)
// But to be safe with alias, we can use relative.

const routes: RouteRecordRaw[] = [
    {
        path: '/aviation',
        name: 'Aviation',
        component: () => import('@/layout/RouteView.vue'),
        meta: { icon: 'flight', project: 'aviation' },
        redirect: { name: 'aviation-dashboard' },
        children: [
            {
                path: '',
                name: 'aviation-dashboard',
                component: () => import('@/modules/aviation/views/Dashboard.vue'),
                meta: { icon: 'dashboard', title: 'Dashboard' }
            },
            {
                path: 'topics',
                name: 'aviation-topics',
                component: () => import('@/modules/aviation/views/TopicsManagement.vue'),
                meta: { icon: 'topic', title: '토픽 관리' }
            },
            {
                path: 'weather',
                name: 'aviation-weather',
                component: () => import('@/modules/aviation/views/WeatherManagement.vue'),
                meta: { icon: 'wb_cloudy', title: '날씨 관리' }
            },
            {
                path: 'backups',
                name: 'aviation-backups',
                component: () => import('@/modules/aviation/views/BackupsManagement.vue'),
                meta: { icon: 'backup', title: '백업 관리' }
            }
        ]
    }
];


export default routes;


