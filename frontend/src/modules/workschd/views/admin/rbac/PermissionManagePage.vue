<template>
  <div>
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
      </div>
      <q-btn color="primary" icon="add" label="권한 추가" @click="openCreateDialog" />
    </div>

    <q-card flat bordered>
      <q-table
        :rows="permissions"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 25 }"
      >
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
      </q-table>
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
            :hint="form.type === 'PAGE' ? '예: /workschd/admin/dashboard' : '예: GET:/workschd/admin/config'"
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
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import apiRbac, { RbacPermission } from '@/modules/workschd/api/api-rbac'

const $q = useQuasar()
const permissions = ref<RbacPermission[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editingPerm = ref<RbacPermission | null>(null)
const filterModule = ref<string | null>(null)
const filterType = ref<string | null>(null)

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

async function load() {
  loading.value = true
  try {
    const res = await apiRbac.listPermissions({
      module: filterModule.value ?? undefined,
      type: filterType.value ?? undefined,
    })
    permissions.value = res.data.data
  } finally {
    loading.value = false
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
