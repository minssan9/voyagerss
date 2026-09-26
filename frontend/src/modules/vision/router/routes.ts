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
                meta: { icon: 'dashboard', title: '구성' }
            },
            {
                path: 'cam',
                name: 'vision-cam',
                component: () => import('@/modules/vision/views/VisionCamTest.vue'),
                meta: { icon: 'videocam', title: '카메라 테스트' }
            },
            {
                path: 'judge',
                name: 'vision-judge',
                component: () => import('@/modules/vision/views/VisionJudgeTest.vue'),
                meta: { icon: 'psychology', title: '판정 테스트' }
            }
        ]
    }
];

export default routes;
