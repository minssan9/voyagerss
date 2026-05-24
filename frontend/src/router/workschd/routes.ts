import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/workschd',
        name: 'Workschd',
        component: () => import('@/layout/RouteView.vue'),
        meta: { icon: 'business_center', project: 'workschd' },
        redirect: { name: 'workschd-home' },
        children: [
            {
                path: '',
                name: 'workschd-home',
                component: () => import('@/views/workschd/main/Home.vue'),
                meta: { icon: 'home', title: 'WorkSchd Home', public: true }
            },
            {
                path: 'team/join/:token',
                name: 'TeamJoin',
                component: () => import('@/views/workschd/team/TeamJoin.vue'),
                meta: { icon: 'group_add', hidden: true, requiresAuth: true, loginPath: '/workschd/login' }
            },
            {
                path: 'team/manage',
                name: 'TeamManage',
                component: () => import('@/views/workschd/team/TeamManage.vue'),
                meta: {
                    icon: 'manage_accounts',
                    requiresAuth: true,
                    loginPath: '/workschd/login',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'task/manage',
                name: 'TaskManage',
                component: () => import('@/views/workschd/task/TaskManage.vue'),
                meta: {
                    icon: 'list',
                    requiresAuth: true,
                    loginPath: '/workschd/login',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'task/manage-mobile',
                name: 'TaskManageMobile',
                component: () => import('@/views/workschd/task/TaskManageMobile.vue'),
                meta: {
                    icon: 'assignment',
                    requiresAuth: true,
                    loginPath: '/workschd/login',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'task/list-mobile',
                name: 'TaskListMobile',
                component: () => import('@/views/workschd/task/TaskListMobile.vue'),
                meta: {
                    icon: 'work',
                    requiresAuth: true,
                    loginPath: '/workschd/login',
                    roles: ['ADMIN', 'TEAM_LEADER', 'HELPER', 'USER', 'ROLE_USER']
                }
            },
            {
                path: 'funeral-board',
                name: 'FuneralBoard',
                component: () => import('@/views/workschd/FuneralBoardView.vue'),
                meta: { icon: 'home', requiresAuth: true, loginPath: '/workschd/login' }
            },
            {
                path: 'admin/dashboard',
                name: 'AdminDashboard',
                component: () => import('@/views/workschd/admin/AdminDashboard.vue'),
                meta: {
                    icon: 'dashboard',
                    requiresAuth: true,
                    loginPath: '/workschd/login',
                    roles: ['ADMIN']
                }
            },
            {
                path: 'auth/callback',
                name: 'WorkschdAuthCallback',
                component: () => import('@/views/common/auth/AuthCallback.vue'),
                meta: { hidden: true }
            }
        ]
    }
]

export default routes
