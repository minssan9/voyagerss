<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-icon name="admin_panel_settings" size="32px" color="primary" class="q-mr-sm" />
      <div>
        <h5 class="q-my-none">RBAC 권한 관리</h5>
        <p class="text-grey-6 q-mb-none text-caption">역할·권한·대상을 통합 관리합니다</p>
      </div>
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      align="left"
      class="q-mb-md text-primary"
      indicator-color="primary"
    >
      <q-tab name="roles" icon="badge" label="역할 관리" @click="$router.push('/workschd/admin/rbac/roles')" />
      <q-tab name="permissions" icon="lock" label="권한 관리" @click="$router.push('/workschd/admin/rbac/permissions')" />
      <q-tab name="role-permissions" icon="link" label="역할-권한 매핑" @click="$router.push('/workschd/admin/rbac/role-permissions')" />
      <q-tab name="subjects" icon="manage_accounts" label="대상-역할 매핑" @click="$router.push('/workschd/admin/rbac/subjects')" />
    </q-tabs>

    <router-view />
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const activeTab = computed(() => {
  const p = route.path
  if (p.includes('role-permissions')) return 'role-permissions'
  if (p.includes('permissions')) return 'permissions'
  if (p.includes('subjects')) return 'subjects'
  return 'roles'
})
</script>
