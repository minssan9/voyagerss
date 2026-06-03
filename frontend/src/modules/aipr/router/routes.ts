import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/aipr',
        name: 'Aipr',
        component: () => import('@/layout/RouteView.vue'),
        meta: { icon: 'settings_suggest', project: 'aipr' },
        redirect: { name: 'aipr-issues' },
        children: [
            {
                path: 'login',
                name: 'aipr-login',
                component: () => import('../views/AiprLogin.vue'),
                meta: { icon: 'login', title: 'Auto-PR Login', public: true }
            },
            {
                path: 'issues',
                name: 'aipr-issues',
                component: () => import('../views/AiprIssuesList.vue'),
                meta: { icon: 'list', title: 'Auto-PR Issues', requiresAuth: true, loginPath: '/aipr/login' }
            },
            {
                path: 'issues/:id',
                name: 'aipr-issue-detail',
                component: () => import('../views/AiprIssueDetail.vue'),
                meta: { icon: 'description', title: 'Auto-PR Issue Details', requiresAuth: true, loginPath: '/aipr/login' }
            },
            {
                path: 'settings',
                name: 'aipr-settings',
                component: () => import('../views/AiprSettings.vue'),
                meta: { icon: 'settings', title: 'Auto-PR Settings', requiresAuth: true, loginPath: '/aipr/login' }
            },
            {
                path: 'widget',
                name: 'aipr-widget',
                component: () => import('../views/AiprWidget.vue'),
                meta: { icon: 'feedback', title: 'Auto-PR Widget', public: true, hidden: true, layout: 'blank' }
            }
        ]
    }
];

export default routes;
