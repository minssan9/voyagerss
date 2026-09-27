<template>
  <div>
    <teleport v-if="docked" to="#workschd-page-toolbar">
      <q-select
        v-model="filterModule"
        :options="moduleOptions"
        :label="t('rbac.common.module')"
        outlined dense emit-value map-options
        @update:model-value="load"
      />
      <q-input v-model="filterSubjectId" :label="t('rbac.subjects.searchSubjectId')" dense outlined clearable
        @keyup.enter="load"
      >
        <template #prepend><q-icon name="search" size="16px" /></template>
      </q-input>
      <q-btn flat dense round icon="refresh" @click="load" />
    </teleport>
    <teleport v-if="docked" to="#workschd-page-actions">
      <q-btn class="workschd-btn" unelevated no-caps dense icon="person_add" :label="t('rbac.subjects.assignRole')" @click="openAssignDialog" />
    </teleport>

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
              <q-tooltip>{{ t('rbac.subjects.revokeTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Assign Role Dialog -->
    <q-dialog v-model="assignDialog" persistent>
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">{{ t('rbac.subjects.assignDialogTitle') }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-sm">
          <q-select
            v-model="assignForm.module"
            :options="moduleOptions"
            :label="t('rbac.common.module') + ' *'"
            outlined dense emit-value map-options
          />
          <q-input
            v-model="assignForm.subjectId"
            :label="t('rbac.subjects.subjectId')"
            outlined dense
            :hint="t('rbac.subjects.subjectIdHint')"
          />
          <q-select
            v-model="assignForm.roleId"
            :options="roleOptions"
            :label="t('rbac.subjects.role')"
            outlined dense emit-value map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('rbac.common.cancel')" @click="assignDialog = false" />
          <q-btn color="primary" :label="t('rbac.common.assign')" :loading="saving" @click="assignRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Subject permission viewer -->
    <q-card v-if="viewingSubject" flat bordered class="q-mt-md">
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-subtitle1">
            <q-icon name="lock" class="q-mr-xs" />
            {{ t('rbac.subjects.effectivePermissions', { module: viewingSubject.module, subjectId: viewingSubject.subjectId }) }}
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
          <span v-if="subjectPermissions.length === 0" class="text-grey-6">{{ t('rbac.subjects.noPermissions') }}</span>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import apiRbac, { RbacRole, RbacSubjectRole, RbacPermission } from '@/modules/workschd/api/api-rbac'
import { useWorkschdHeaderDock } from '@/modules/workschd/composables/useWorkschdHeaderDock'

const { t } = useI18n()
const docked = useWorkschdHeaderDock()
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
  { label: 'aipr', value: 'aipr' },
  { label: 'aviation', value: 'aviation' },
]

const roleOptions = computed(() =>
  roles.value.map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))
)

const columns = computed(() => [
  { name: 'module', label: t('rbac.common.module'), field: 'module', align: 'center' as const, sortable: true },
  { name: 'subjectId', label: t('rbac.subjects.subjectIdColumn'), field: 'subjectId', align: 'left' as const, sortable: true },
  { name: 'role', label: t('rbac.subjects.role').replace(' *', ''), field: 'role', align: 'left' as const },
  {
    name: 'viewPerms', label: t('rbac.subjects.viewPermissions'), field: 'viewPerms', align: 'center' as const,
    format: (_: any, row: RbacSubjectRole) => row,
  },
  { name: 'actions', label: '', field: 'actions', align: 'right' as const },
])

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
    $q.notify({ type: 'positive', message: t('rbac.subjects.assigned') })
    assignDialog.value = false
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? t('rbac.subjects.error') })
  } finally {
    saving.value = false
  }
}

function confirmRevoke(sr: RbacSubjectRole) {
  $q.dialog({
    title: t('rbac.subjects.revokeTitle'),
    message: t('rbac.subjects.revokeMessage', { role: sr.role.name, module: sr.module, subjectId: sr.subjectId }),
    cancel: true,
    ok: { color: 'negative', label: t('rbac.common.revoke') },
  }).onOk(async () => {
    try {
      const currentRoles = await apiRbac.getSubjectRoles(sr.module, sr.subjectId)
      const remainingIds = currentRoles.data.data
        .map((r: RbacSubjectRole) => r.roleId)
        .filter((id: number) => id !== sr.roleId)
      await apiRbac.setSubjectRoles(sr.module, sr.subjectId, remainingIds)
      $q.notify({ type: 'positive', message: t('rbac.subjects.revoked') })
      await load()
      if (viewingSubject.value?.module === sr.module && viewingSubject.value?.subjectId === sr.subjectId) {
        await viewPerms(sr)
      }
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.response?.data?.message ?? t('rbac.subjects.revokeFailed') })
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
