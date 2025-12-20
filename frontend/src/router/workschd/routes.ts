import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    // Workschd parent route - 1 depth tree structure
    {
        path: '/workschd',
        name: 'Workschd',
        meta: { icon: 'business_center' }, // requiresAuth: true,  roles: ['WORKER', 'MANAGER', 'SCHEDULER'], 
        children: [
            // Team routes - flattened to 1 depth
            {
                path: 'team/join/:token', // :token
                name: 'TeamJoin (Worker)',
                component: () => import('@/views/workschd/team/TeamJoin.vue'),
                meta: { icon: 'group_add' },
                hidden: true
            },
            {
                path: 'team/manage',
                name: 'TeamManage (Manager)',
                component: () => import('@/views/workschd/team/TeamManage.vue'),
                meta: { icon: 'manage_accounts' }
            },
            // Task routes - flattened to 1 depth
            {
                path: 'task/manage',
                name: 'TaskManage (Manager)',
                component: () => import('@/views/workschd/task/TaskManage.vue'),
                meta: { icon: 'list' }
            },
            {
                path: 'task/manage-mobile',
                name: 'TaskManageMobile (Manager)',
                component: () => import('@/views/workschd/task/TaskManageMobile.vue'),
                meta: { icon: 'assignment' }
            },
            {
                path: 'task/list-mobile',
                name: 'TaskListMobile (Worker)',
                component: () => import('@/views/workschd/task/TaskListMobile.vue'),
                meta: { icon: 'work', }
            }
        ]
    }
]

export default routes
