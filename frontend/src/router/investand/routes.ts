import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // Investand Routes - using main layout
  {
    path: '/investand',
    name: 'Investand',
    component: () => import('@/layout/RouteView.vue'),
    meta: { icon: 'show_chart' },
    redirect: { name: 'investand-landing' },
    children: [
      {
        path: '',
        name: 'investand-landing',
        component: () => import('@/views/investand/Landing.vue'),
        meta: { title: 'Investand Landing', icon: 'home' }
      },
      {
        path: 'home',
        name: 'investand-home',
        component: () => import('@/views/investand/IndexPage.vue'),
        meta: { title: 'Investand Home', icon: 'home' }
      },
      {
        path: 'history',
        name: 'investand-history',
        component: () => import('@/views/investand/HistoryPage.vue'),
        meta: { title: 'History', icon: 'history' }
      },
      {
        path: 'dart-data',
        name: 'investand-dart-data',
        component: () => import('@/views/investand/DartDataPage.vue'),
        meta: { title: 'DART Data', icon: 'view_list' }
      },
      {
        path: 'dart-manage',
        name: 'investand-dart-manage',
        component: () => import('@/views/investand/DartManagePage.vue'),
        meta: { title: 'DART Management', icon: 'manage_search' }
      },
      {
        path: 'findash',
        name: 'investand-findash',
        component: () => import('@/views/investand/FindashLayout.vue'),
        meta: { icon: 'analytics' },
        children: [
          {
            path: '',
            redirect: { name: 'FindashMarketLab' }
          },
          {
            path: 'settings',
            name: 'FindashSettings',
            component: () => import('@/views/investand/Settings.vue'),
            meta: { icon: 'settings' }
          },
          {
            path: 'market-lab',
            name: 'FindashMarketLab',
            component: () => import('@/views/investand/MarketLab.vue'),
            meta: { icon: 'science' }
          },
          {
            path: 'sector-comparison',
            name: 'FindashSectorComparison',
            component: () => import('@/views/investand/SectorComparison.vue'),
            meta: { icon: 'assessment', title: 'Sector Comparison' }
          },
          {
            path: 'global-assets',
            name: 'FindashGlobalAssets',
            component: () => import('@/views/investand/GlobalAssetComparison.vue'),
            meta: { icon: 'public', title: 'Global Assets' }
          }
        ]
      }
    ],
  },


  // Admin Routes - using wrapper component
  {
    path: '/investand/admin',
    name: 'Admin',
    meta: { icon: 'admin_panel_settings' }, // requiresAuth: true, 
    children: [
      // Admin Login
      {
        path: 'login',
        name: 'admin-login',
        component: () => import('@/views/common/auth/AdminLogin.vue'),
        meta: { title: 'Admin Login' } // , requiresGuest: true
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/views/investand/admin/DashboardPage.vue'),
        meta: { title: 'Admin Dashboard', icon: 'dashboard' }
      },
      {
        path: 'dart',
        name: 'admin-dart',
        component: () => import('@/views/investand/admin/DartAdminPage.vue'),
        meta: { title: 'DART Data Management', icon: 'description' }
      },
      {
        path: 'fear-greed',
        name: 'admin-fear-greed',
        component: () => import('@/views/investand/admin/FearGreedAdminPage.vue'),
        meta: { title: 'Fear & Greed Index Management', icon: 'psychology' }
      },
    ]
  },


  // NotFound handler inside investand? 
  // Probably remove catchAll from module and let main router handle 404

]

export default routes

