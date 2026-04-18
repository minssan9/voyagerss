import { RouteRecordRaw } from 'vue-router';

export const autodevRoutes: RouteRecordRaw[] = [
  {
    path: '/autodev',
    redirect: '/autodev/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'AutodevDashboard',
        component: () => import('@/views/autodev/DashboardPage.vue'),
        meta: { icon: 'smart_toy' },
      },
      {
        path: 'issues',
        name: 'AutodevIssues',
        component: () => import('@/views/autodev/IssuePage.vue'),
        meta: { icon: 'bug_report' },
      },
      {
        path: 'jobs',
        name: 'AutodevJobs',
        component: () => import('@/views/autodev/JobPage.vue'),
        meta: { icon: 'work' },
      },
      {
        path: 'todos',
        name: 'AutodevTodos',
        component: () => import('@/views/autodev/TodoPage.vue'),
        meta: { icon: 'checklist' },
      },
      {
        path: 'settings',
        name: 'AutodevSettings',
        component: () => import('@/views/autodev/SettingsPage.vue'),
        meta: { icon: 'settings' },
      },
    ],
  },
];
