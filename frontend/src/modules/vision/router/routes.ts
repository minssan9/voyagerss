import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/vision',
        name: 'Vision',
        component: () => import('@/layout/RouteView.vue'),
        meta: { icon: 'visibility', project: 'vision' },
        redirect: { name: 'vision-home' },
        children: [
            {
                path: '',
                name: 'vision-home',
                component: () => import('@/modules/vision/views/VisionHome.vue'),
                meta: { icon: 'dashboard', titleKey: 'routes.visionHome' }
            },
            {
                path: 'cam',
                name: 'vision-cam',
                component: () => import('@/modules/vision/views/VisionCamTest.vue'),
                meta: { icon: 'videocam', titleKey: 'routes.visionCam' }
            },
            {
                path: 'judge',
                name: 'vision-judge',
                component: () => import('@/modules/vision/views/VisionJudgeTest.vue'),
                meta: { icon: 'psychology', titleKey: 'routes.visionJudge' }
            },
            {
                path: 'airspace',
                name: 'vision-airspace',
                component: () => import('@/modules/vision/views/AirspaceMonitor.vue'),
                meta: { icon: 'radar', titleKey: 'routes.visionAirspace' }
            },
            {
                path: 'airspace/history',
                name: 'vision-airspace-history',
                component: () => import('@/modules/vision/views/AirspaceHistory.vue'),
                meta: { icon: 'history', titleKey: 'routes.visionAirspaceHistory' }
            }
        ]
    }
];

export default routes;
