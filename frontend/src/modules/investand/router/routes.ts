import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/modules/investand/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/modules/investand/pages/IndexPage.vue'),
        meta: { title: 'investand' }
      },
      {
        path: 'history',
        component: () => import('@/modules/investand/pages/HistoryPage.vue'),
        meta: { title: 'Fear & Greed Index 히스토리' }
      },
      {
        path: 'statistics',
        component: () => import('@/modules/investand/pages/StatisticsPage.vue'),
        meta: { title: 'Fear & Greed Index 통계' }
      },
      {
        path: 'about',
        component: () => import('@/modules/investand/pages/AboutPage.vue'),
        meta: { title: 'About - Fear & Greed Index' }
      },
      {
        path: 'dart-data',
        component: () => import('@/modules/investand/pages/DartDataPage.vue'),
        meta: { title: 'DART 공시 데이터' }
      },
      {
        path: 'dart-manage',
        component: () => import('@/modules/investand/pages/DartManagePage.vue'),
        meta: { title: 'DART 주식 보유현황 관리' }
      }
    ],
  },

  // Admin Login
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/modules/investand/pages/admin/LoginPage.vue'),
    meta: { title: 'Admin Login', requiresGuest: true }
  },
  // Admin Routes
  {
    path: '/admin',
    component: () => import('@/modules/investand/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/modules/investand/pages/admin/DashboardPage.vue'),
        meta: { title: 'Admin Dashboard' }
      },
      {
        path: 'dart',
        name: 'admin-dart',
        component: () => import('@/modules/investand/pages/admin/DartAdminPage.vue'),
        meta: { title: 'DART Data Management' }
      },
      {
        path: 'fear-greed',
        name: 'admin-fear-greed',
        component: () => import('@/modules/investand/pages/admin/FearGreedAdminPage.vue'),
        meta: { title: 'Fear & Greed Index Management' }
      }
    ]
  },

  // NotFound handler inside investand? 
  // Probably remove catchAll from module and let main router handle 404

]

export default routes 