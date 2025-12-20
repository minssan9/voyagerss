import { RouteRecordRaw } from 'vue-router';

const findashRoutes: RouteRecordRaw[] = [
    {
        path: '/findash',
        meta: { icon: 'analytics' },
        children: [
            {
                path: '',
                redirect: 'market-lab'
            },
            {
                path: 'settings',
                name: 'FindashSettings',
                component: () => import('@/views/findash/Settings.vue'),
                meta: { icon: 'settings' }
            },
            {
                path: 'market-lab',
                name: 'FindashMarketLab',
                component: () => import('@/views/findash/MarketLab.vue'),
                meta: { icon: 'science' }
            }
        ]
    }
];

export default findashRoutes;


