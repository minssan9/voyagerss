import { RouteRecordRaw } from 'vue-router';
import workschdRoutes from '@/router/workschd/routes';
import aviationRoutes from '@/router/aviation/routes';
import investandRoutes from '@/router/investand/routes';
import findashRoutes from '@/router/findash/routes';

// Workschd Routes (Default)
const mainRoutes: RouteRecordRaw[] = [

    { path: '/', name: 'home', component: () => import('@/views/workschd/main/Home.vue'), meta: { icon: 'home' } },
    { path: '/about', name: 'about', component: () => import('@/views/workschd/main/About.vue'), meta: { icon: 'info' } },
    { path: '/subscription', name: 'Subscription', component: () => import('@/views/workschd/main/Subscription.vue'), meta: { icon: 'card_membership' } },

    ...aviationRoutes,
    ...investandRoutes,
    ...findashRoutes,
    ...workschdRoutes,
    { path: '/privacy-policy', name: 'PrivacyPolicy', component: () => import('@/views/workschd/main/PrivacyPolicy.vue'), meta: { icon: 'policy' }, hidden: true },
    { path: '/terms', name: 'Terms', component: () => import('@/views/workschd/main/Terms.vue'), meta: { icon: 'description' }, hidden: true },
    { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/workschd/main/Dashboard.vue'), meta: { icon: 'dashboard' } },
    { path: '/login', name: 'login', component: () => import('@/views/workschd/auth/Login.vue'), meta: { icon: 'login' }, hidden: true },
    { path: '/redirect', name: 'redirect', component: () => import('@/views/workschd/auth/redirect.vue'), meta: { icon: 'refresh' }, hidden: true },
    { path: '/signup', name: 'Signup', component: () => import('@/views/workschd/auth/Signup.vue'), meta: { icon: 'person_add', requiresAuth: false }, hidden: true },
    { path: '/account/profile', name: 'AccountProfile', component: () => import('@/views/workschd/account/AccountProfile.vue'), meta: { icon: 'person' }, hidden: true },
    { path: '/account/schedule', name: 'AccountSchedule', component: () => import('@/views/workschd/account/AccountSchedule.vue'), meta: { icon: 'calendar_today' }, hidden: true },

    { path: '/401', name: 'Unauthorized', component: () => import('@/views/workschd/error/401.vue'), meta: { icon: 'gpp_bad' }, hidden: true },
    { path: '/403', name: 'Forbidden', component: () => import('@/views/workschd/error/403.vue'), meta: { icon: 'block' }, hidden: true }    // 404 handled globally at end

];

// Using flat spread might range better if prefixing is manual
export const routes: RouteRecordRaw[] = [
    ...mainRoutes,
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/workschd/error/404.vue'), meta: { icon: 'search_off' }, hidden: true }
];



