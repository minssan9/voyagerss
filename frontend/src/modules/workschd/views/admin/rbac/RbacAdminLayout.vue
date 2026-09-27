<template>
  <WorkschdPage :title="t('rbac.title')" :subtitle="t('rbac.subtitle')">
    <template #toolbar>
      <q-tabs v-model="activeTab" dense no-caps align="left" indicator-color="primary" class="text-primary">
        <q-tab name="roles" :label="t('rbac.tabs.roles')" @click="$router.push('/workschd/admin/rbac/roles')" />
        <q-tab name="permissions" :label="t('rbac.tabs.permissions')" @click="$router.push('/workschd/admin/rbac/permissions')" />
        <q-tab name="role-permissions" :label="t('rbac.tabs.rolePermissions')" @click="$router.push('/workschd/admin/rbac/role-permissions')" />
        <q-tab name="subjects" :label="t('rbac.tabs.subjects')" @click="$router.push('/workschd/admin/rbac/subjects')" />
      </q-tabs>
    </template>
    <router-view />
  </WorkschdPage>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import WorkschdPage from '@/modules/workschd/components/WorkschdPage.vue'

const route = useRoute()
const { t } = useI18n()

const activeTab = computed(() => {
  const p = route.path
  if (p.includes('role-permissions')) return 'role-permissions'
  if (p.includes('permissions')) return 'permissions'
  if (p.includes('subjects')) return 'subjects'
  return 'roles'
})
</script>
