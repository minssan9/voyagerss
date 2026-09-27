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
                meta: { icon: 'home', titleKey: 'routes.workschdHome', public: true }
            },
            {
                path: 'team/join/:token',
                name: 'TeamJoin',
                component: () => import('@/modules/workschd/views/team/TeamJoin.vue'),
                meta: { icon: 'group_add', hidden: true, requiresAuth: true, loginPath: '/login?service=workschd' }
            },
            {
                path: 'admin/team',
                name: 'TeamManage',
                component: () => import('@/modules/workschd/views/admin/TeamManage.vue'),
                meta: {
                    icon: 'manage_accounts',
                    titleKey: 'routes.teamManage',
                    surface: 'admin',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'admin/tasks',
                name: 'TaskManage',
                component: () => import('@/modules/workschd/views/admin/TaskManage.vue'),
                meta: {
                    icon: 'list',
                    titleKey: 'routes.taskManage',
                    surface: 'admin',
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'admin/tasks/mobile',
                name: 'TaskManageMobile',
                component: () => import('@/modules/workschd/views/admin/TaskManageMobile.vue'),
                meta: {
                    icon: 'assignment',
                    titleKey: 'routes.taskManageMobile',
                    surface: 'admin',
                    mobile: true,
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    roles: ['ADMIN', 'TEAM_LEADER']
                }
            },
            {
                path: 'm/tasks',
                name: 'TaskListMobile',
                component: () => import('@/modules/workschd/views/worker/TaskListMobile.vue'),
                meta: {
                    icon: 'work',
                    titleKey: 'routes.myTasks',
                    surface: 'worker',
                    mobile: true,
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    workerNav: true,
                    roles: ['ADMIN', 'TEAM_LEADER', 'MEMBER', 'WORKER', 'HELPER', 'USER', 'ROLE_USER']
                }
            },
            {
                path: 'm/board',
                name: 'FuneralBoard',
                component: () => import('@/modules/workschd/views/worker/FuneralBoardView.vue'),
                meta: {
                    icon: 'event_note',
                    titleKey: 'routes.funeralBoard',
                    surface: 'worker',
                    mobile: true,
                    requiresAuth: true,
                    loginPath: '/login?service=workschd',
                    workerNav: true
                }
            },
            {
                path: 'admin/dashboard',
                name: 'AdminDashboard',
                component: () => import('@/modules/workschd/views/admin/AdminDashboard.vue'),
                meta: {
                    icon: 'dashboard',
                    titleKey: 'routes.adminDashboard',
                    surface: 'admin',
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
                    surface: 'admin',
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
                        meta: {
                            icon: 'badge',
                            titleKey: 'routes.rbacRoles',
                            surface: 'admin',
                            requiresAuth: true,
                            roles: ['ADMIN']
                        }
                    },
                    {
                        path: 'permissions',
                        name: 'RbacPermissions',
                        component: () => import('@/modules/workschd/views/admin/rbac/PermissionManagePage.vue'),
                        meta: {
                            icon: 'lock',
                            titleKey: 'routes.rbacPermissions',
                            surface: 'admin',
                            requiresAuth: true,
                            roles: ['ADMIN']
                        }
                    },
                    {
                        path: 'role-permissions',
                        name: 'RbacRolePermissions',
                        component: () => import('@/modules/workschd/views/admin/rbac/RolePermissionPage.vue'),
                        meta: {
                            icon: 'link',
                            titleKey: 'routes.rbacRolePermissions',
                            surface: 'admin',
                            requiresAuth: true,
                            roles: ['ADMIN']
                        }
                    },
                    {
                        path: 'subjects',
                        name: 'RbacSubjects',
                        component: () => import('@/modules/workschd/views/admin/rbac/SubjectRolePage.vue'),
                        meta: {
                            icon: 'manage_accounts',
                            titleKey: 'routes.rbacSubjectRoles',
                            surface: 'admin',
                            requiresAuth: true,
                            roles: ['ADMIN']
                        }
                    }
                ]
            },
            {
                path: 'task/list-mobile',
                redirect: { name: 'TaskListMobile' },
                meta: { hidden: true }
            },
            {
                path: 'funeral-board',
                redirect: { name: 'FuneralBoard' },
                meta: { hidden: true }
            },
            {
                path: 'team/manage',
                redirect: { name: 'TeamManage' },
                meta: { hidden: true }
            },
            {
                path: 'task/manage',
                redirect: { name: 'TaskManage' },
                meta: { hidden: true }
            },
            {
                path: 'task/manage-mobile',
                redirect: { name: 'TaskManageMobile' },
                meta: { hidden: true }
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
