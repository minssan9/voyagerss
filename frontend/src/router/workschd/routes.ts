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
                meta: { icon: 'home', title: 'WorkSchd 홈' }
            },
            {
                path: 'team/join/:token',
                name: 'TeamJoin',
                component: () => import('@/views/workschd/team/TeamJoin.vue'),
                meta: { icon: 'group_add', hidden: true }
            },
            {
                path: 'team/manage',
                name: 'TeamManage',
                component: () => import('@/views/workschd/team/TeamManage.vue'),
                meta: { icon: 'manage_accounts', title: '팀 관리' }
            },
            {
                path: 'task/manage',
                name: 'TaskManage',
                component: () => import('@/views/workschd/task/TaskManage.vue'),
                meta: { icon: 'list_alt', title: '업무 관리' }
            },
            {
                path: 'task/manage-mobile',
                name: 'TaskManageMobile',
                component: () => import('@/views/workschd/task/TaskManageMobile.vue'),
                meta: { icon: 'assignment', title: '업무 관리 (모바일)' }
            },
            {
                path: 'task/list-mobile',
                name: 'TaskListMobile',
                component: () => import('@/views/workschd/task/TaskListMobile.vue'),
                meta: { icon: 'work_outline', title: '업무 목록' }
            },
            {
                path: 'funeral-board',
                name: 'FuneralBoard',
                component: () => import('@/views/workschd/FuneralBoardView.vue'),
                meta: { icon: 'local_hospital', title: '장례 현황판' }
            },
            {
                path: 'admin/dashboard',
                name: 'AdminDashboard',
                component: () => import('@/views/workschd/admin/AdminDashboard.vue'),
                meta: { icon: 'admin_panel_settings', title: '관리자 대시보드', requiresAuth: true, roles: ['ADMIN'] }
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
