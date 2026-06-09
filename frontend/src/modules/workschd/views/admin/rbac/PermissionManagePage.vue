<template>
  <div>
    <!-- Header row -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-sm">
        <div class="text-h6">권한 목록</div>
        <q-select
          v-model="filterModule"
          :options="moduleOptions"
          label="모듈 필터"
          dense outlined clearable
          emit-value map-options
          style="min-width: 140px"
          @update:model-value="load"
        />
        <q-select
          v-model="filterType"
          :options="typeOptions"
          label="유형 필터"
          dense outlined clearable
          emit-value map-options
          style="min-width: 120px"
          @update:model-value="load"
        />
        <q-toggle v-model="showDeclaredOnly" label="코드 선언만" dense />
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          outline color="teal" icon="sync" label="코드→DB 동기화"
          :loading="syncing" @click="syncPermissions"
        >
          <q-tooltip>코드에 선언된 권한을 DB에 자동 반영하고 기본 역할을 할당합니다</q-tooltip>
        </q-btn>
        <q-btn color="primary" icon="add" label="권한 추가" @click="openCreateDialog" />
      </div>
    </div>

    <!-- Sync result banner -->
    <q-banner v-if="lastSyncResult" class="q-mb-sm bg-teal-1 text-teal-9" rounded dense>
      <template v-slot:avatar><q-icon name="check_circle" color="teal" /></template>
      동기화 완료 — 신규: <strong>{{ lastSyncResult.created }}</strong>건,
      업데이트: <strong>{{ lastSyncResult.updated }}</strong>건,
      역할 할당 추가: <strong>{{ lastSyncResult.rolesAssigned }}</strong>건 /
      전체 코드 선언: <strong>{{ lastSyncResult.total }}</strong>건
      <template v-slot:action>
        <q-btn flat dense icon="close" @click="lastSyncResult = null" />
      </template>
    </q-banner>

    <q-card flat bordered>
      <q-table
        :rows="filteredPermissions"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 30 }"
      >
        <template v-slot:body-cell-code="props">
          <q-td :props="props">
            <span class="text-body2">{{ props.row.code }}</span>
            <q-chip
              v-if="declaredCodes.has(props.row.code)"
              dense color="teal-1" text-color="teal-9" icon="code"
              size="sm" class="q-ml-xs"
            >코드 선언</q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-chip dense :color="props.row.type === 'PAGE' ? 'purple-2' : 'blue-2'"
              :text-color="props.row.type === 'PAGE' ? 'purple-9' : 'blue-9'">
              {{ props.row.type === 'PAGE' ? '페이지' : 'API' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-module="props">
          <q-td :props="props">
            <q-chip dense color="grey-3" text-color="grey-9">{{ props.row.module }}</q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-resource="props">
          <q-td :props="props">
            <code class="text-caption bg-grey-2 q-px-xs rounded-borders">{{ props.row.resource }}</code>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>수정</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete" color="negative" @click="confirmDelete(props.row)">
              <q-tooltip>삭제</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <!-- Undeclared permissions panel -->
        <template v-slot:top-row v-if="undeclaredInDb.length > 0 && !showDeclaredOnly">
          <q-tr class="bg-orange-1">
            <q-td colspan="100%">
              <q-icon name="warning" color="orange-8" class="q-mr-xs" />
              <span class="text-caption text-orange-9">
                DB에만 존재 (코드 미선언): {{ undeclaredInDb.map(p => p.code).join(', ') }}
              </span>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>

    <!-- Declared-only unsynced list -->
    <q-card v-if="declaredNotInDb.length > 0" flat bordered class="q-mt-md bg-blue-1">
      <q-card-section>
        <div class="row items-center justify-between">
          <div>
            <q-icon name="code" color="blue-8" class="q-mr-xs" />
            <span class="text-subtitle2 text-blue-9">코드 선언 → DB 미동기화 권한 ({{ declaredNotInDb.length }}건)</span>
          </div>
          <q-btn flat dense color="blue-8" icon="sync" label="지금 동기화" :loading="syncing" @click="syncPermissions" />
        </div>
        <div class="row q-gutter-xs q-mt-sm">
          <q-chip
            v-for="p in declaredNotInDb" :key="p.code"
            dense color="blue-2" text-color="blue-9" icon="add"
          >{{ p.code }}</q-chip>
        </div>
      </q-card-section>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: 480px">
        <q-card-section>
          <div class="text-h6">{{ editingPerm ? '권한 수정' : '권한 추가' }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-sm">
          <q-input
            v-if="!editingPerm"
            v-model="form.code"
            label="권한 코드 *"
            outlined dense
            hint="예: workschd:page:admin-dashboard"
          />
          <q-input v-model="form.name" label="권한 이름 *" outlined dense />
          <div class="row q-gutter-sm">
            <q-select
              v-model="form.type"
              :options="typeOptions"
              label="유형 *"
              outlined dense emit-value map-options
              class="col"
            />
            <q-select
              v-model="form.module"
              :options="moduleOptions"
              label="모듈 *"
              outlined dense emit-value map-options
              class="col"
            />
          </div>
          <q-input
            v-model="form.resource"
            label="리소스 경로 *"
            outlined dense
            :hint="form.type === 'PAGE' ? '예: /workschd/admin/dashboard' : '예: GET:/api/workschd/admin/config'"
          />
          <q-input v-model="form.description" label="설명" outlined dense type="textarea" rows="2" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" @click="dialog = false" />
          <q-btn color="primary" :label="editingPerm ? '저장' : '추가'" :loading="saving" @click="savePerm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import apiRbac, { RbacPermission, DeclaredPermission, SyncResult } from '@/modules/workschd/api/api-rbac'

const $q = useQuasar()
const permissions = ref<RbacPermission[]>([])
const declaredPerms = ref<DeclaredPermission[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const syncing = ref(false)
const editingPerm = ref<RbacPermission | null>(null)
const filterModule = ref<string | null>(null)
const filterType = ref<string | null>(null)
const showDeclaredOnly = ref(false)
const lastSyncResult = ref<SyncResult | null>(null)

const form = ref<{
  code: string; name: string; type: 'PAGE' | 'API'; module: string; resource: string; description: string
}>({ code: '', name: '', type: 'PAGE', module: 'workschd', resource: '', description: '' })

const moduleOptions = [
  { label: 'workschd', value: 'workschd' },
  { label: 'investand', value: 'investand' },
  { label: 'aipr', value: 'aipr' },
  { label: 'aviation', value: 'aviation' },
  { label: 'ALL', value: 'ALL' },
]

const typeOptions = [
  { label: '페이지', value: 'PAGE' },
  { label: 'API', value: 'API' },
]

const columns = [
  { name: 'code', label: '권한 코드', field: 'code', align: 'left' as const, sortable: true },
  { name: 'name', label: '이름', field: 'name', align: 'left' as const, sortable: true },
  { name: 'type', label: '유형', field: 'type', align: 'center' as const, sortable: true },
  { name: 'module', label: '모듈', field: 'module', align: 'center' as const, sortable: true },
  { name: 'resource', label: '리소스', field: 'resource', align: 'left' as const },
  { name: 'actions', label: '', field: 'actions', align: 'right' as const },
]

const declaredCodes = computed(() => new Set(declaredPerms.value.map((p) => p.code)))

const declaredNotInDb = computed(() => declaredPerms.value.filter((p) => !p.inDb))

const undeclaredInDb = computed(() =>
  permissions.value.filter((p) => !declaredCodes.value.has(p.code))
)

const filteredPermissions = computed(() => {
  let list = permissions.value
  if (filterModule.value) list = list.filter((p) => p.module === filterModule.value)
  if (filterType.value) list = list.filter((p) => p.type === filterType.value)
  if (showDeclaredOnly.value) list = list.filter((p) => declaredCodes.value.has(p.code))
  return list
})

async function load() {
  loading.value = true
  try {
    const [permRes, declaredRes] = await Promise.all([
      apiRbac.listPermissions({
        module: filterModule.value ?? undefined,
        type: filterType.value ?? undefined,
      }),
      apiRbac.getDeclaredPermissions().catch(() => ({ data: { data: [] } })),
    ])
    permissions.value = permRes.data.data
    declaredPerms.value = declaredRes.data.data
  } finally {
    loading.value = false
  }
}

async function syncPermissions() {
  syncing.value = true
  try {
    const res = await apiRbac.syncPermissions()
    lastSyncResult.value = res.data
    $q.notify({ type: 'positive', message: `동기화 완료: ${res.data.created}건 신규, ${res.data.rolesAssigned}건 역할 할당` })
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? '동기화 실패' })
  } finally {
    syncing.value = false
  }
}

function openCreateDialog() {
  editingPerm.value = null
  form.value = { code: '', name: '', type: 'PAGE', module: 'workschd', resource: '', description: '' }
  dialog.value = true
}

function openEditDialog(perm: RbacPermission) {
  editingPerm.value = perm
  form.value = {
    code: perm.code,
    name: perm.name,
    type: perm.type,
    module: perm.module,
    resource: perm.resource,
    description: perm.description ?? '',
  }
  dialog.value = true
}

async function savePerm() {
  if (!form.value.name.trim() || !form.value.resource.trim()) return
  saving.value = true
  try {
    if (editingPerm.value) {
      await apiRbac.updatePermission(editingPerm.value.id, {
        name: form.value.name,
        type: form.value.type,
        module: form.value.module as any,
        resource: form.value.resource,
        description: form.value.description,
      })
      $q.notify({ type: 'positive', message: '권한이 수정되었습니다.' })
    } else {
      if (!form.value.code.trim()) return
      await apiRbac.createPermission(form.value)
      $q.notify({ type: 'positive', message: '권한이 추가되었습니다.' })
    }
    dialog.value = false
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? '오류가 발생했습니다.' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(perm: RbacPermission) {
  $q.dialog({
    title: '권한 삭제',
    message: `"${perm.name}" 권한을 삭제하시겠습니까?`,
    cancel: true,
    ok: { color: 'negative', label: '삭제' },
  }).onOk(async () => {
    try {
      await apiRbac.deletePermission(perm.id)
      $q.notify({ type: 'positive', message: '삭제되었습니다.' })
      await load()
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.response?.data?.message ?? '삭제 실패' })
    }
  })
}

onMounted(load)
</script>
