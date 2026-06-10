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
                component: () => import('@/modules/workschd/views/main/Home.vue'),
                meta: { icon: 'home', title: 'WorkSchd Home', public: true }
            },
            {
                path: 'team/join/:token',
                name: 'TeamJoin',
                component: () => import('@/modules/workschd/views/team/TeamJoin.vue'),
                meta: { icon: 'group_add', hidden: true, requiresAuth: true, loginPath: '/login?service=workschd' }
            },
            {
                path: 'team/manage',
                name: 'TeamManage',
                component: () => import('@/modules/workschd/views/team/TeamManage.vue'),
                meta: {
                    icon: 'manage_accounts',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'task/manage',
                name: 'TaskManage',
                component: () => import('@/modules/workschd/views/task/TaskManage.vue'),
                meta: {
                    icon: 'list',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'task/manage-mobile',
                name: 'TaskManageMobile',
                component: () => import('@/modules/workschd/views/task/TaskManageMobile.vue'),
                meta: {
                    icon: 'assignment',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'task/list-mobile',
                name: 'TaskListMobile',
                component: () => import('@/modules/workschd/views/task/TaskListMobile.vue'),
                meta: {
                    icon: 'work',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN', 'TEAM_LEADER', 'HELPER', 'USER', 'ROLE_USER']
                }
            },
            {
                path: 'funeral-board',
                name: 'FuneralBoard',
                component: () => import('@/modules/workschd/views/FuneralBoardView.vue'),
                meta: { icon: 'home', requiresAuth: true, loginPath: '/login?service=workschd' }
            },
            {
                path: 'admin/dashboard',
                name: 'AdminDashboard',
                component: () => import('@/modules/workschd/views/admin/AdminDashboard.vue'),
                meta: {
                    icon: 'dashboard',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN']
                }
            },
            {
                path: 'admin/rbac',
                name: 'RbacAdmin',
                component: () => import('@/modules/workschd/views/admin/rbac/RbacAdminLayout.vue'),
                meta: {
                    icon: 'admin_panel_settings',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN'],
                    rbacPermission: 'workschd:page:admin-rbac'
                },
                redirect: { name: 'RbacRoles' },
                children: [
                    {
                        path: 'roles',
                        name: 'RbacRoles',
                        component: () => import('@/modules/workschd/views/admin/rbac/RoleManagePage.vue'),
                        meta: { icon: 'badge', title: '역할 관리', requiresAuth: true, roles: ['ADMIN'] }
                    },
                    {
                        path: 'permissions',
                        name: 'RbacPermissions',
                        component: () => import('@/modules/workschd/views/admin/rbac/PermissionManagePage.vue'),
                        meta: { icon: 'lock', title: '권한 관리', requiresAuth: true, roles: ['ADMIN'] }
                    },
                    {
                        path: 'role-permissions',
                        name: 'RbacRolePermissions',
                        component: () => import('@/modules/workschd/views/admin/rbac/RolePermissionPage.vue'),
                        meta: { icon: 'link', title: '역할-권한 매핑', requiresAuth: true, roles: ['ADMIN'] }
                    },
                    {
                        path: 'subjects',
                        name: 'RbacSubjects',
                        component: () => import('@/modules/workschd/views/admin/rbac/SubjectRolePage.vue'),
                        meta: { icon: 'manage_accounts', title: '대상-역할 매핑', requiresAuth: true, roles: ['ADMIN'] }
                    }
                ]
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
