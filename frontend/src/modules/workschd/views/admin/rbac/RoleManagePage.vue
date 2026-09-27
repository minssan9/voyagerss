<template>
  <div>
    <teleport v-if="docked" to="#workschd-page-actions">
      <q-btn class="workschd-btn" unelevated no-caps dense icon="add" :label="t('rbac.roles.addRole')" @click="openCreateDialog" />
    </teleport>

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
              {{ props.row.isSystem ? t('rbac.common.system') : t('rbac.common.custom') }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-counts="props">
          <q-td :props="props">
            <q-chip dense color="blue-1" text-color="blue-9" icon="lock">{{ t('rbac.common.permissionsCount', { count: props.row._count?.rolePermissions ?? 0 }) }}</q-chip>
            <q-chip dense color="green-1" text-color="green-9" icon="people" class="q-ml-xs">{{ t('rbac.common.subjectsCount', { count: props.row._count?.subjectRoles ?? 0 }) }}</q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" color="primary" :disable="props.row.isSystem" @click="openEditDialog(props.row)">
              <q-tooltip>{{ t('rbac.common.edit') }}</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete" color="negative" :disable="props.row.isSystem" @click="confirmDelete(props.row)">
              <q-tooltip>{{ t('rbac.common.delete') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingRole ? t('rbac.roles.editRole') : t('rbac.roles.addRole') }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-sm">
          <q-input
            v-if="!editingRole"
            v-model="form.code"
            :label="t('rbac.roles.roleCode')"
            outlined dense
            :hint="t('rbac.roles.roleCodeHint')"
          />
          <q-input v-model="form.name" :label="t('rbac.roles.roleName')" outlined dense />
          <q-input v-model="form.description" :label="t('rbac.common.description')" outlined dense type="textarea" rows="2" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('rbac.common.cancel')" @click="dialog = false" />
          <q-btn color="primary" :label="editingRole ? t('rbac.common.save') : t('rbac.common.add')" :loading="saving" @click="saveRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import apiRbac, { RbacRole } from '@/modules/workschd/api/api-rbac'
import { useWorkschdHeaderDock } from '@/modules/workschd/composables/useWorkschdHeaderDock'

const { t } = useI18n()
const docked = useWorkschdHeaderDock()
const $q = useQuasar()
const roles = ref<RbacRole[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editingRole = ref<RbacRole | null>(null)
const form = ref({ code: '', name: '', description: '' })

const columns = computed(() => [
  { name: 'code', label: t('rbac.common.code'), field: 'code', align: 'left' as const, sortable: true },
  { name: 'name', label: t('rbac.common.name'), field: 'name', align: 'left' as const, sortable: true },
  { name: 'description', label: t('rbac.common.description'), field: 'description', align: 'left' as const },
  { name: 'isSystem', label: t('rbac.common.roleType'), field: 'isSystem', align: 'center' as const },
  { name: 'counts', label: t('rbac.common.connections'), align: 'center' as const, field: 'counts' },
  { name: 'actions', label: '', field: 'actions', align: 'right' as const },
])

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
      $q.notify({ type: 'positive', message: t('rbac.roles.updated') })
    } else {
      if (!form.value.code.trim()) return
      await apiRbac.createRole(form.value)
      $q.notify({ type: 'positive', message: t('rbac.roles.created') })
    }
    dialog.value = false
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? t('rbac.common.error') })
  } finally {
    saving.value = false
  }
}

function confirmDelete(role: RbacRole) {
  $q.dialog({
    title: t('rbac.roles.deleteTitle'),
    message: t('rbac.roles.deleteMessage', { name: role.name }),
    cancel: true,
    ok: { color: 'negative', label: t('rbac.common.delete') },
  }).onOk(async () => {
    try {
      await apiRbac.deleteRole(role.id)
      $q.notify({ type: 'positive', message: t('rbac.common.deleted') })
      await load()
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.response?.data?.message ?? t('rbac.common.deleteFailed') })
    }
  })
}

onMounted(load)
</script>
