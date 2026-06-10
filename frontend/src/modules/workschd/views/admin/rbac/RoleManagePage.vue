<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6">역할 목록</div>
      <q-btn color="primary" icon="add" label="역할 추가" @click="openCreateDialog" />
    </div>

    <q-card flat bordered>
      <q-table
        :rows="roles"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 20 }"
      >
        <template v-slot:body-cell-isSystem="props">
          <q-td :props="props">
            <q-chip :color="props.row.isSystem ? 'orange' : 'grey-4'" :text-color="props.row.isSystem ? 'white' : 'grey-8'" dense>
              {{ props.row.isSystem ? '시스템' : '커스텀' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-counts="props">
          <q-td :props="props">
            <q-chip dense color="blue-1" text-color="blue-9" icon="lock">{{ props.row._count?.rolePermissions ?? 0 }} 권한</q-chip>
            <q-chip dense color="green-1" text-color="green-9" icon="people" class="q-ml-xs">{{ props.row._count?.subjectRoles ?? 0 }} 대상</q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" color="primary" :disable="props.row.isSystem" @click="openEditDialog(props.row)">
              <q-tooltip>수정</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete" color="negative" :disable="props.row.isSystem" @click="confirmDelete(props.row)">
              <q-tooltip>삭제</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingRole ? '역할 수정' : '역할 추가' }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-sm">
          <q-input
            v-if="!editingRole"
            v-model="form.code"
            label="역할 코드 *"
            outlined dense
            hint="예: TEAM_MANAGER (영문 대문자/언더스코어)"
          />
          <q-input v-model="form.name" label="역할 이름 *" outlined dense />
          <q-input v-model="form.description" label="설명" outlined dense type="textarea" rows="2" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" @click="dialog = false" />
          <q-btn color="primary" :label="editingRole ? '저장' : '추가'" :loading="saving" @click="saveRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import apiRbac, { RbacRole } from '@/modules/workschd/api/api-rbac'

const $q = useQuasar()
const roles = ref<RbacRole[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editingRole = ref<RbacRole | null>(null)
const form = ref({ code: '', name: '', description: '' })

const columns = [
  { name: 'code', label: '코드', field: 'code', align: 'left' as const, sortable: true },
  { name: 'name', label: '이름', field: 'name', align: 'left' as const, sortable: true },
  { name: 'description', label: '설명', field: 'description', align: 'left' as const },
  { name: 'isSystem', label: '유형', field: 'isSystem', align: 'center' as const },
  { name: 'counts', label: '연결', align: 'center' as const, field: 'counts' },
  { name: 'actions', label: '', field: 'actions', align: 'right' as const },
]

async function load() {
  loading.value = true
  try {
    const res = await apiRbac.listRoles()
    roles.value = res.data.data
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingRole.value = null
  form.value = { code: '', name: '', description: '' }
  dialog.value = true
}

function openEditDialog(role: RbacRole) {
  editingRole.value = role
  form.value = { code: role.code, name: role.name, description: role.description ?? '' }
  dialog.value = true
}

async function saveRole() {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    if (editingRole.value) {
      await apiRbac.updateRole(editingRole.value.id, { name: form.value.name, description: form.value.description })
      $q.notify({ type: 'positive', message: '역할이 수정되었습니다.' })
    } else {
      if (!form.value.code.trim()) return
      await apiRbac.createRole(form.value)
      $q.notify({ type: 'positive', message: '역할이 추가되었습니다.' })
    }
    dialog.value = false
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? '오류가 발생했습니다.' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(role: RbacRole) {
  $q.dialog({
    title: '역할 삭제',
    message: `"${role.name}" 역할을 삭제하시겠습니까? 연결된 권한과 대상 매핑도 함께 삭제됩니다.`,
    cancel: true,
    ok: { color: 'negative', label: '삭제' },
  }).onOk(async () => {
    try {
      await apiRbac.deleteRole(role.id)
      $q.notify({ type: 'positive', message: '삭제되었습니다.' })
      await load()
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.response?.data?.message ?? '삭제 실패' })
    }
  })
}

onMounted(load)
</script>
