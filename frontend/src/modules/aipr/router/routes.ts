import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/aipr',
        name: 'Aipr',
        component: () => import('@/layout/RouteView.vue'),
        meta: { icon: 'settings_suggest', project: 'aipr' },
        redirect: { name: 'aipr-home' },
        children: [
            {
                path: '',
                name: 'aipr-home',
                component: () => import('../views/AiprHome.vue'),
                meta: { icon: 'home', title: 'Aipr Home', public: true }
            },
            {
                path: 'login',
                name: 'aipr-login',
                redirect: () => ({ path: '/login', query: { service: 'aipr' } })
            },
            {
                path: 'issues',
                name: 'aipr-issues',
                component: () => import('../views/AiprIssuesList.vue'),
                meta: { icon: 'list', title: 'Auto-PR Issues', requiresAuth: true, loginPath: '/login?service=aipr' }
            },
            {
                path: 'issues/:id',
                name: 'aipr-issue-detail',
                component: () => import('../views/AiprIssueDetail.vue'),
                meta: { icon: 'description', title: 'Auto-PR Issue Details', requiresAuth: true, loginPath: '/login?service=aipr' }
            },
            {
                path: 'settings',
                name: 'aipr-settings',
                component: () => import('../views/AiprSettings.vue'),
                meta: { icon: 'settings', title: 'Auto-PR Settings', requiresAuth: true, loginPath: '/login?service=aipr' }
            },
            {
                path: 'widget',
                name: 'aipr-widget',
                component: () => import('../views/AiprWidget.vue'),
                meta: { icon: 'feedback', title: 'Auto-PR Widget', public: true, hidden: true, layout: 'blank' }
            },
            {
                path: 'providers',
                name: 'aipr-providers',
                component: () => import('../views/AiprProviders.vue'),
                meta: { icon: 'hub', title: 'Git Providers', requiresAuth: true, loginPath: '/login?service=aipr' }
            },
            {
                path: 'repos',
                name: 'aipr-repos',
                component: () => import('../views/AiprRepos.vue'),
                meta: { icon: 'folder_open', title: 'Repositories', requiresAuth: true, loginPath: '/login?service=aipr' }
            },
            {
                path: 'repos/:repoId/issues',
                name: 'aipr-repo-issues',
                component: () => import('../views/AiprRepoIssues.vue'),
                meta: { icon: 'bug_report', title: 'Remote Issues', requiresAuth: true, loginPath: '/login?service=aipr' }
            }
        ]
    }
];

export default routes;
