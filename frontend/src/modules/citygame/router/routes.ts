import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/citygame',
        name: 'citygame',
        component: () => import('@/modules/citygame/views/CityGamePage.vue'),
        meta: { title: '3D City Builder', icon: 'location_city', layout: 'blank', project: 'citygame' },
    },
]

export default routes
