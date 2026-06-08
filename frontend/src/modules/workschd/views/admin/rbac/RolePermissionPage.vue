<template>
  <div class="row q-gutter-md">
    <!-- Left: Role list -->
    <q-card flat bordered style="min-width: 240px; width: 240px">
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle2">역할 선택</div>
      </q-card-section>
      <q-list dense>
        <q-item
          v-for="role in roles"
          :key="role.id"
          clickable
          :active="selectedRole?.id === role.id"
          active-class="bg-primary text-white"
          @click="selectRole(role)"
        >
          <q-item-section>
            <q-item-label>{{ role.name }}</q-item-label>
            <q-item-label caption :class="selectedRole?.id === role.id ? 'text-white' : ''">{{ role.code }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip dense :color="selectedRole?.id === role.id ? 'white' : 'blue-2'"
              :text-color="selectedRole?.id === role.id ? 'primary' : 'blue-9'">
              {{ role._count?.rolePermissions ?? 0 }}
            </q-chip>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Right: Permission assignment -->
    <div class="col">
      <div v-if="!selectedRole" class="column items-center justify-center" style="height: 300px">
        <q-icon name="arrow_back" size="48px" color="grey-4" />
        <p class="text-grey-6 q-mt-sm">역할을 선택해 주세요</p>
      </div>

      <div v-else>
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-subtitle1 text-bold">{{ selectedRole.name }} <span class="text-grey-6 text-body2">({{ selectedRole.code }})</span></div>
          <q-btn color="primary" label="저장" icon="save" :loading="saving" @click="save" />
        </div>

        <div class="row q-gutter-sm q-mb-sm">
          <q-input v-model="searchPerm" label="권한 검색" dense outlined clearable style="min-width: 200px">
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
          <q-select
            v-model="filterType"
            :options="typeOptions"
            label="유형"
            dense outlined clearable
            emit-value map-options
            style="min-width: 120px"
          />
          <q-select
            v-model="filterModule"
            :options="moduleOptions"
            label="모듈"
            dense outlined clearable
            emit-value map-options
            style="min-width: 130px"
          />
        </div>

        <q-card flat bordered>
          <q-table
            :rows="filteredPermissions"
            :columns="permColumns"
            row-key="id"
            flat
            :loading="loadingPerms"
            :pagination="{ rowsPerPage: 30 }"
          >
            <template v-slot:body-cell-check="props">
              <q-td :props="props">
                <q-checkbox v-model="selectedPermIds" :val="props.row.id" dense />
              </q-td>
            </template>
            <template v-slot:body-cell-type="props">
              <q-td :props="props">
                <q-chip dense :color="props.row.type === 'PAGE' ? 'purple-2' : 'blue-2'"
                  :text-color="props.row.type === 'PAGE' ? 'purple-9' : 'blue-9'" size="sm">
                  {{ props.row.type === 'PAGE' ? '페이지' : 'API' }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-module="props">
              <q-td :props="props">
                <q-chip dense color="grey-3" text-color="grey-9" size="sm">{{ props.row.module }}</q-chip>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import apiRbac, { RbacRole, RbacPermission } from '@/modules/workschd/api/api-rbac'

const $q = useQuasar()
const roles = ref<RbacRole[]>([])
const allPermissions = ref<RbacPermission[]>([])
const selectedRole = ref<RbacRole | null>(null)
const selectedPermIds = ref<number[]>([])
const loadingPerms = ref(false)
const saving = ref(false)
const searchPerm = ref('')
const filterType = ref<string | null>(null)
const filterModule = ref<string | null>(null)

const moduleOptions = [
  { label: 'workschd', value: 'workschd' },
  { label: 'investand', value: 'investand' },
  { label: 'aipr', value: 'aipr' },
  { label: 'aviation', value: 'aviation' },
]

const typeOptions = [
  { label: '페이지', value: 'PAGE' },
  { label: 'API', value: 'API' },
]

const permColumns = [
  { name: 'check', label: '', field: 'check', align: 'center' as const, style: 'width: 40px' },
  { name: 'name', label: '권한 이름', field: 'name', align: 'left' as const, sortable: true },
  { name: 'code', label: '코드', field: 'code', align: 'left' as const, sortable: true },
  { name: 'type', label: '유형', field: 'type', align: 'center' as const },
  { name: 'module', label: '모듈', field: 'module', align: 'center' as const },
  { name: 'resource', label: '리소스', field: 'resource', align: 'left' as const },
]

const filteredPermissions = computed(() => {
  let list = allPermissions.value
  if (filterType.value) list = list.filter((p) => p.type === filterType.value)
  if (filterModule.value) list = list.filter((p) => p.module === filterModule.value)
  if (searchPerm.value.trim()) {
    const q = searchPerm.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
  }
  return list
})

async function loadRoles() {
  const res = await apiRbac.listRoles()
  roles.value = res.data.data
}

async function loadAllPermissions() {
  const res = await apiRbac.listPermissions()
  allPermissions.value = res.data.data
}

async function selectRole(role: RbacRole) {
  selectedRole.value = role
  loadingPerms.value = true
  try {
    const res = await apiRbac.getRolePermissions(role.id)
    selectedPermIds.value = res.data.data.map((rp: any) => rp.permission.id)
  } catch (e: any) {
    selectedPermIds.value = []
    selectedRole.value = null
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? '권한 목록을 불러오지 못했습니다.' })
  } finally {
    loadingPerms.value = false
  }
}

async function save() {
  if (!selectedRole.value) return
  saving.value = true
  try {
    await apiRbac.setRolePermissions(selectedRole.value.id, selectedPermIds.value)
    $q.notify({ type: 'positive', message: '권한 매핑이 저장되었습니다.' })
    await loadRoles()
    await selectRole(selectedRole.value)
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? '저장 실패' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadRoles(), loadAllPermissions()])
})
</script>
