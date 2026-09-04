import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // Investand Routes - using main layout
  {
    path: '/investand',
    name: 'Investand',
    component: () => import('@/layout/RouteView.vue'),
    meta: { icon: 'show_chart', project: 'investand' },
    redirect: { name: 'investand-landing' },
    children: [
      {
        path: '',
        name: 'investand-landing',
        component: () => import('@/modules/investand/views/IndexPage.vue'),
        meta: { title: 'Investand 홈', icon: 'home' }
      },
      {
        path: 'market-lab',
        name: 'investand-market-lab',
        component: () => import('@/modules/investand/views/MarketLab.vue'),
        meta: { title: '마켓 랩 (Market Lab)', icon: 'science' }
      },
      {
        path: 'sector',
        name: 'investand-sector',
        component: () => import('@/modules/investand/views/SectorComparison.vue'),
        meta: { title: '섹터 분석 (Sector)', icon: 'assessment' }
      },
      {
        path: 'global',
        name: 'investand-global',
        component: () => import('@/modules/investand/views/GlobalAssetComparison.vue'),
        meta: { title: '글로벌 자산 (Global)', icon: 'public' }
      },
      {
        path: 'dart',
        name: 'investand-dart',
        component: () => import('@/modules/investand/views/DartDataPage.vue'),
        meta: { title: 'DART 기업공시', icon: 'view_list' }
      },
      {
        path: 'bok',
        name: 'investand-bok',
        component: () => import('@/modules/investand/views/EconomicPage.vue'),
        meta: { title: 'BOK 경제지표', icon: 'account_balance' }
      },
      {
        path: 'settings',
        name: 'investand-settings',
        component: () => import('@/modules/investand/views/Settings.vue'),
        meta: { title: '설정 (Settings)', icon: 'settings' }
      },
      // Admin Routes - using wrapper component
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/layout/RouteView.vue'),
        meta: { icon: 'admin_panel_settings' }, // requiresAuth: true, 
        redirect: { name: 'admin-dashboard' },
        children: [
          // Admin Login
          {
            path: 'login',
            name: 'admin-login',
            redirect: () => ({ path: '/login', query: { service: 'investand' } })
          },
          {
            path: 'dashboard',
            name: 'admin-dashboard',
            component: () => import('@/modules/investand/views/admin/DashboardPage.vue'),
            meta: { title: 'Admin Dashboard', icon: 'dashboard', adminAuth: true }
          },
          {
            path: 'dart',
            name: 'admin-dart',
            component: () => import('@/modules/investand/views/admin/DartAdminPage.vue'),
            meta: { title: 'DART Data Management', icon: 'description', adminAuth: true }
          },
          {
            path: 'fear-greed',
            name: 'admin-fear-greed',
            component: () => import('@/modules/investand/views/admin/FearGreedAdminPage.vue'),
            meta: { title: 'Fear & Greed Index Management', icon: 'psychology', adminAuth: true }
          },
        ]
      }
    ],
  },





  // NotFound handler inside investand? 
  // Probably remove catchAll from module and let main router handle 404

]

export default routes

