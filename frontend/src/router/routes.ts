import { RouteRecordRaw } from 'vue-router';
import workschdRoutes from '@/router/workschd/routes';
import aviationRoutes from '@/router/aviation/routes';
import investandRoutes from '@/router/investand/routes';

// ─── Common Routes ───────────────────────────────────────────────
const commonRoutes: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: () => import('@/views/Landing.vue'), meta: { icon: 'home' } },
    { path: '/about', name: 'about', component: () => import('@/views/workschd/main/About.vue'), meta: { icon: 'info' } },
    { path: '/subscription', name: 'Subscription', component: () => import('@/views/workschd/main/Subscription.vue'), meta: { icon: 'card_membership' } },
    { path: '/privacy-policy', name: 'PrivacyPolicy', component: () => import('@/views/workschd/main/PrivacyPolicy.vue'), meta: { icon: 'policy', hidden: true } },
    { path: '/terms', name: 'Terms', component: () => import('@/views/workschd/main/Terms.vue'), meta: { icon: 'description', hidden: true } },
    { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/workschd/main/Dashboard.vue'), meta: { icon: 'dashboard' } },
];

// ─── Auth & Account Routes ───────────────────────────────────────
const authRoutes: RouteRecordRaw[] = [
    { path: '/login', name: 'login', component: () => import('@/views/common/auth/Login.vue'), meta: { icon: 'login', hidden: true } },
    { path: '/redirect', name: 'redirect', component: () => import('@/views/common/auth/redirect.vue'), meta: { icon: 'refresh', hidden: true } },
    { path: '/signup', name: 'Signup', component: () => import('@/views/common/auth/Signup.vue'), meta: { icon: 'person_add', requiresAuth: false, hidden: true } },
    { path: '/account/profile', name: 'AccountProfile', component: () => import('@/views/common/account/AccountProfile.vue'), meta: { icon: 'person', hidden: true } },
    { path: '/account/schedule', name: 'AccountSchedule', component: () => import('@/views/common/account/AccountSchedule.vue'), meta: { icon: 'calendar_today', hidden: true } },
    { path: '/workschd/login', name: 'WorkschdLogin', component: () => import('@/views/workschd/WorkschdLogin.vue'), meta: { icon: 'login', hidden: true } },
    { path: '/auth/callback', name: 'AuthCallback', component: () => import('@/views/common/auth/AuthCallback.vue'), meta: { icon: 'refresh', hidden: true } },
];

// ─── Error Routes ────────────────────────────────────────────────
const errorRoutes: RouteRecordRaw[] = [
    { path: '/401', name: 'Unauthorized', component: () => import('@/views/common/error/401.vue'), meta: { icon: 'gpp_bad', hidden: true } },
    { path: '/403', name: 'Forbidden', component: () => import('@/views/common/error/403.vue'), meta: { icon: 'block', hidden: true } },
];

// ─── Sub-Project Routes (separated by project) ──────────────────
// Each sub-project has its own entry path prefix:
//   /aviation/*   → Aviation
//   /investand/*  → Investand
//   /workschd/*   → Workschd

// ─── Assemble All Routes ─────────────────────────────────────────
export const routes: RouteRecordRaw[] = [
    ...commonRoutes,
    ...authRoutes,
    ...aviationRoutes,
    ...investandRoutes,
    ...workschdRoutes,
    ...errorRoutes,
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/common/error/404.vue'), meta: { icon: 'search_off', hidden: true } }
];
