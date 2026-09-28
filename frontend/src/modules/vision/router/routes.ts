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
                path: 'live',
                name: 'vision-live',
                component: () => import('@/modules/vision/views/VisionLiveTest.vue'),
                meta: { icon: 'sensors', titleKey: 'routes.visionLive' }
            },
            {
                path: 'judge',
                name: 'vision-judge',
                component: () => import('@/modules/vision/views/VisionJudgeTest.vue'),
                meta: { icon: 'psychology', titleKey: 'routes.visionJudge' }
            }
        ]
    }
];

export default routes;
