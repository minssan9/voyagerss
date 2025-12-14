import { RouteRecordRaw } from 'vue-router';
import aviationRoutes from '../modules/aviation/router/routes';
import investandRoutes from '../modules/investand/router/routes';

// Workschd Routes (Default)
const workschdRoutes: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: () => import('@/views/main/Home.vue'), meta: { icon: 'home' } },
    { path: '/about', name: 'about', component: () => import('@/views/main/About.vue'), meta: { icon: 'info' } },
    { path: '/subscription', name: 'Subscription', component: () => import('@/views/main/Subscription.vue'), meta: { icon: 'card_membership' } },
    { path: '/privacy-policy', name: 'PrivacyPolicy', component: () => import('@/views/main/PrivacyPolicy.vue'), meta: { icon: 'policy' }, hidden: true },
    { path: '/terms', name: 'Terms', component: () => import('@/views/main/Terms.vue'), meta: { icon: 'description' }, hidden: true },
    { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/main/Dashboard.vue'), meta: { icon: 'dashboard' } },
    { path: '/login', name: 'login', component: () => import('@/views/auth/Login.vue'), meta: { icon: 'login' }, hidden: true },
    { path: '/redirect', name: 'redirect', component: () => import('@/views/auth/redirect.vue'), meta: { icon: 'refresh' }, hidden: true },
    { path: '/signup', name: 'Signup', component: () => import('@/views/auth/Signup.vue'), meta: { icon: 'person_add', requiresAuth: false }, hidden: true },
    { path: '/account/profile', name: 'AccountProfile', component: () => import('@/views/account/AccountProfile.vue'), meta: { icon: 'person' }, hidden: true },
    { path: '/account/schedule', name: 'AccountSchedule', component: () => import('@/views/account/AccountSchedule.vue'), meta: { icon: 'calendar_today' }, hidden: true },
    {
        path: '/team', name: 'Team', meta: { roles: ['MANAGER', 'SCHEDULER'], requiresAuth: true, icon: 'groups' },
        children: [
            { path: '/team/join/:token', name: 'TeamJoin (Worker)', component: () => import('@/views/team/TeamJoin.vue'), meta: { roles: ['WORKER', 'MANAGER', 'SCHEDULER'], requiresAuth: true, icon: 'group_add' }, hidden: true },
            { path: '/team/manage', name: 'TeamManage (Manager)', component: () => import('@/views/team/TeamManage.vue'), meta: { icon: 'manage_accounts' } },
        ]
    },
    {
        path: '/task', name: 'Task', meta: { roles: ['WORKER', 'MANAGER', 'SCHEDULER'], requiresAuth: true, icon: 'event' },
        children: [
            { path: '/task/manage', name: 'TaskManage (Manager)', component: () => import('@/views/task/TaskManage.vue'), meta: { icon: 'list' } },
            { path: '/task/manage-mobile', name: 'TaskManageMobile (Manager)', component: () => import('@/views/task/TaskManageMobile.vue'), meta: { icon: 'assignment', roles: ['MANAGER', 'SCHEDULER'] } },
            { path: '/task/list-mobile', name: 'TaskListMobile (Worker)', component: () => import('@/views/task/TaskListMobile.vue'), meta: { icon: 'work', roles: ['WORKER'] } }
        ]
    },
    { path: '/401', name: 'Unauthorized', component: () => import('@/views/error/401.vue'), meta: { icon: 'gpp_bad' }, hidden: true },
    { path: '/403', name: 'Forbidden', component: () => import('@/views/error/403.vue'), meta: { icon: 'block' }, hidden: true }
    // 404 handled globally at end
];

// Re-map Investand routes to be prefixed if they clash?
// Investand routes have path: '/'. This clashes with Workschd '/'.
// I should prefix them.
const prefixedInvestandRoutes = investandRoutes.map(route => ({
    ...route,
    path: route.path.startsWith('/') ? `/investand${route.path}` : `/investand/${route.path}`
}));
// Fix children paths too if nested?
// If I use a wrapper route for investand, it's easier.

const investandWrapper: RouteRecordRaw = {
    path: '/investand',
    component: () => import('@/modules/investand/layouts/MainLayout.vue'), // Assuming MainLayout exists
    children: investandRoutes
};
// Investand routes already define component MainLayout at root '/'.
// So I can just change the path of the root route to '/investand'.

investandRoutes.forEach(r => {
    if (r.path === '/' || r.path === '') {
        r.path = '/investand';
    }
    // Also admin
    if (r.path === '/admin') {
        r.path = '/investand/admin';
    }
});

// Using flat spread might range better if prefixing is manual
export const routes: RouteRecordRaw[] = [
    ...workschdRoutes,
    ...aviationRoutes,
    ...investandRoutes,
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/error/404.vue'), meta: { icon: 'search_off' }, hidden: true }
];
