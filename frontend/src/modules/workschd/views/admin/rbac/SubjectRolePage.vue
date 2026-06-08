<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-md">
      <q-select
        v-model="filterModule"
        :options="moduleOptions"
        label="모듈"
        outlined dense emit-value map-options
        style="min-width: 140px"
        @update:model-value="load"
      />
      <q-input v-model="filterSubjectId" label="대상 ID 검색" dense outlined clearable style="min-width: 200px"
        @keyup.enter="load"
      >
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>
      <q-btn color="grey-7" flat icon="refresh" round @click="load" />
      <q-space />
      <q-btn color="primary" icon="person_add" label="역할 부여" @click="openAssignDialog" />
    </div>

    <q-card flat bordered>
      <q-table
        :rows="subjectRoles"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 25 }"
      >
        <template v-slot:body-cell-module="props">
          <q-td :props="props">
            <q-chip dense color="grey-3" text-color="grey-9">{{ props.row.module }}</q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-role="props">
          <q-td :props="props">
            <q-chip dense color="primary" text-color="white">{{ props.row.role.name }}</q-chip>
            <span class="text-caption text-grey-6 q-ml-xs">({{ props.row.role.code }})</span>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="delete" color="negative" @click="confirmRevoke(props.row)">
              <q-tooltip>역할 해제</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Assign Role Dialog -->
    <q-dialog v-model="assignDialog" persistent>
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">역할 부여</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-sm">
          <q-select
            v-model="assignForm.module"
            :options="moduleOptions"
            label="모듈 *"
            outlined dense emit-value map-options
          />
          <q-input
            v-model="assignForm.subjectId"
            label="대상 ID *"
            outlined dense
            hint="workschd: accountId(숫자), investand/aipr: admin ID(문자열)"
          />
          <q-select
            v-model="assignForm.roleId"
            :options="roleOptions"
            label="역할 *"
            outlined dense emit-value map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" @click="assignDialog = false" />
          <q-btn color="primary" label="부여" :loading="saving" @click="assignRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Subject permission viewer -->
    <q-card v-if="viewingSubject" flat bordered class="q-mt-md">
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-subtitle1">
            <q-icon name="lock" class="q-mr-xs" />
            {{ viewingSubject.module }}:{{ viewingSubject.subjectId }} 의 유효 권한
          </div>
          <q-btn flat round dense icon="close" @click="viewingSubject = null" />
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row q-gutter-xs">
          <q-chip
            v-for="perm in subjectPermissions"
            :key="perm.id"
            dense
            :color="perm.type === 'PAGE' ? 'purple-1' : 'blue-1'"
            :text-color="perm.type === 'PAGE' ? 'purple-9' : 'blue-9'"
            :icon="perm.type === 'PAGE' ? 'web' : 'api'"
          >
            {{ perm.name }}
          </q-chip>
          <span v-if="subjectPermissions.length === 0" class="text-grey-6">부여된 권한 없음</span>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import apiRbac, { RbacRole, RbacSubjectRole, RbacPermission } from '@/modules/workschd/api/api-rbac'

const $q = useQuasar()
const subjectRoles = ref<RbacSubjectRole[]>([])
const roles = ref<RbacRole[]>([])
const loading = ref(false)
const saving = ref(false)
const assignDialog = ref(false)
const filterModule = ref<string>('workschd')
const filterSubjectId = ref('')
const viewingSubject = ref<{ module: string; subjectId: string } | null>(null)
const subjectPermissions = ref<RbacPermission[]>([])

const assignForm = ref({ module: 'workschd', subjectId: '', roleId: null as number | null })

const moduleOptions = [
  { label: 'workschd', value: 'workschd' },
  { label: 'investand', value: 'investand' },
  { label: 'aipr', value: 'aipr' },
  { label: 'aviation', value: 'aviation' },
]

const roleOptions = computed(() =>
  roles.value.map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))
)

const columns = [
  { name: 'module', label: '모듈', field: 'module', align: 'center' as const, sortable: true },
  { name: 'subjectId', label: '대상 ID', field: 'subjectId', align: 'left' as const, sortable: true },
  { name: 'role', label: '역할', field: 'role', align: 'left' as const },
  {
    name: 'viewPerms', label: '권한 확인', field: 'viewPerms', align: 'center' as const,
    format: (_: any, row: RbacSubjectRole) => row,
  },
  { name: 'actions', label: '', field: 'actions', align: 'right' as const },
]

async function load() {
  loading.value = true
  try {
    const res = await apiRbac.listSubjectRoles({
      module: filterModule.value,
      subjectId: filterSubjectId.value || undefined,
    })
    subjectRoles.value = res.data.data
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  const res = await apiRbac.listRoles()
  roles.value = res.data.data
}

function openAssignDialog() {
  assignForm.value = { module: filterModule.value, subjectId: '', roleId: null }
  assignDialog.value = true
}

async function assignRole() {
  if (!assignForm.value.subjectId.trim() || !assignForm.value.roleId) return
  saving.value = true
  try {
    const currentRoles = await apiRbac.getSubjectRoles(assignForm.value.module, assignForm.value.subjectId)
    const currentIds = currentRoles.data.data.map((sr: RbacSubjectRole) => sr.roleId)
    if (!currentIds.includes(assignForm.value.roleId)) {
      await apiRbac.setSubjectRoles(assignForm.value.module, assignForm.value.subjectId, [
        ...currentIds,
        assignForm.value.roleId,
      ])
    }
    $q.notify({ type: 'positive', message: '역할이 부여되었습니다.' })
    assignDialog.value = false
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? '오류 발생' })
  } finally {
    saving.value = false
  }
}

function confirmRevoke(sr: RbacSubjectRole) {
  $q.dialog({
    title: '역할 해제',
    message: `"${sr.role.name}" 역할을 ${sr.module}:${sr.subjectId} 에서 해제하시겠습니까?`,
    cancel: true,
    ok: { color: 'negative', label: '해제' },
  }).onOk(async () => {
    try {
      const currentRoles = await apiRbac.getSubjectRoles(sr.module, sr.subjectId)
      const remainingIds = currentRoles.data.data
        .map((r: RbacSubjectRole) => r.roleId)
        .filter((id: number) => id !== sr.roleId)
      await apiRbac.setSubjectRoles(sr.module, sr.subjectId, remainingIds)
      $q.notify({ type: 'positive', message: '역할이 해제되었습니다.' })
      await load()
      if (viewingSubject.value?.module === sr.module && viewingSubject.value?.subjectId === sr.subjectId) {
        await viewPerms(sr)
      }
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.response?.data?.message ?? '해제 실패' })
    }
  })
}

async function viewPerms(sr: RbacSubjectRole) {
  viewingSubject.value = { module: sr.module, subjectId: sr.subjectId }
  const res = await apiRbac.getSubjectPermissions(sr.module, sr.subjectId)
  subjectPermissions.value = res.data.data
}

onMounted(async () => {
  await Promise.all([load(), loadRoles()])
})
</script>
