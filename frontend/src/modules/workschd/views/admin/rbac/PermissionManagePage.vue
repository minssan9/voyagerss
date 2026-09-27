<template>
  <div>
    <!-- Header row -->
    <teleport v-if="docked" to="#workschd-page-toolbar">
      <q-select
        v-model="filterModule"
        :options="moduleOptions"
        :label="t('rbac.permissions.moduleFilter')"
        dense outlined clearable
        emit-value map-options
        @update:model-value="load"
      />
      <q-select
        v-model="filterType"
        :options="typeOptions"
        :label="t('rbac.permissions.typeFilter')"
        dense outlined clearable
        emit-value map-options
        @update:model-value="load"
      />
      <q-toggle v-model="showDeclaredOnly" :label="t('rbac.permissions.declaredOnly')" dense />
    </teleport>
    <teleport v-if="docked" to="#workschd-page-actions">
      <q-btn
        outline no-caps dense color="teal" icon="sync" :label="t('rbac.permissions.syncCodeToDb')"
        :loading="syncing" @click="syncPermissions"
      >
        <q-tooltip>{{ t('rbac.permissions.syncTooltip') }}</q-tooltip>
      </q-btn>
      <q-btn class="workschd-btn" unelevated no-caps dense icon="add" :label="t('rbac.permissions.addPermission')" @click="openCreateDialog" />
    </teleport>

    <!-- Sync result banner -->
    <q-banner v-if="lastSyncResult" class="q-mb-sm bg-teal-1 text-teal-9" rounded dense>
      <template v-slot:avatar><q-icon name="check_circle" color="teal" /></template>
      {{ t('rbac.permissions.syncBanner', {
        created: lastSyncResult.created,
        updated: lastSyncResult.updated,
        rolesAssigned: lastSyncResult.rolesAssigned,
        total: lastSyncResult.total,
      }) }}
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
            >{{ t('rbac.permissions.codeDeclared') }}</q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-chip dense :color="props.row.type === 'PAGE' ? 'purple-2' : 'blue-2'"
              :text-color="props.row.type === 'PAGE' ? 'purple-9' : 'blue-9'">
              {{ props.row.type === 'PAGE' ? t('rbac.common.typePage') : t('rbac.common.typeApi') }}
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
              <q-tooltip>{{ t('rbac.common.edit') }}</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete" color="negative" @click="confirmDelete(props.row)">
              <q-tooltip>{{ t('rbac.common.delete') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <!-- Undeclared permissions panel -->
        <template v-slot:top-row v-if="undeclaredInDb.length > 0 && !showDeclaredOnly">
          <q-tr class="bg-orange-1">
            <q-td colspan="100%">
              <q-icon name="warning" color="orange-8" class="q-mr-xs" />
              <span class="text-caption text-orange-9">
                {{ t('rbac.permissions.dbOnlyUndeclared', { codes: undeclaredInDb.map(p => p.code).join(', ') }) }}
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
            <span class="text-subtitle2 text-blue-9">{{ t('rbac.permissions.unsyncedTitle', { count: declaredNotInDb.length }) }}</span>
          </div>
          <q-btn flat dense color="blue-8" icon="sync" :label="t('rbac.permissions.syncNow')" :loading="syncing" @click="syncPermissions" />
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
          <div class="text-h6">{{ editingPerm ? t('rbac.permissions.editPermission') : t('rbac.permissions.addPermission') }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-sm">
          <q-input
            v-if="!editingPerm"
            v-model="form.code"
            :label="t('rbac.permissions.permissionCode')"
            outlined dense
            :hint="t('rbac.permissions.permissionCodeHint')"
          />
          <q-input v-model="form.name" :label="t('rbac.permissions.permissionName')" outlined dense />
          <div class="row q-gutter-sm">
            <q-select
              v-model="form.type"
              :options="typeOptions"
              :label="t('rbac.common.type') + ' *'"
              outlined dense emit-value map-options
              class="col"
            />
            <q-select
              v-model="form.module"
              :options="moduleOptions"
              :label="t('rbac.common.module') + ' *'"
              outlined dense emit-value map-options
              class="col"
            />
          </div>
          <q-input
            v-model="form.resource"
            :label="t('rbac.permissions.resourcePath')"
            outlined dense
            :hint="form.type === 'PAGE' ? t('rbac.permissions.resourceHintPage') : t('rbac.permissions.resourceHintApi')"
          />
          <q-input v-model="form.description" :label="t('rbac.common.description')" outlined dense type="textarea" rows="2" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('rbac.common.cancel')" @click="dialog = false" />
          <q-btn color="primary" :label="editingPerm ? t('rbac.common.save') : t('rbac.common.add')" :loading="saving" @click="savePerm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import apiRbac, { RbacPermission, DeclaredPermission, SyncResult } from '@/modules/workschd/api/api-rbac'
import { useWorkschdHeaderDock } from '@/modules/workschd/composables/useWorkschdHeaderDock'

const { t } = useI18n()
const docked = useWorkschdHeaderDock()
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
  { label: 'aipr', value: 'aipr' },
  { label: 'aviation', value: 'aviation' },
  { label: 'ALL', value: 'ALL' },
]

const typeOptions = computed(() => [
  { label: t('rbac.common.typePage'), value: 'PAGE' },
  { label: t('rbac.common.typeApi'), value: 'API' },
])

const columns = computed(() => [
  { name: 'code', label: t('rbac.permissions.permissionCodeColumn'), field: 'code', align: 'left' as const, sortable: true },
  { name: 'name', label: t('rbac.common.name'), field: 'name', align: 'left' as const, sortable: true },
  { name: 'type', label: t('rbac.common.type'), field: 'type', align: 'center' as const, sortable: true },
  { name: 'module', label: t('rbac.common.module'), field: 'module', align: 'center' as const, sortable: true },
  { name: 'resource', label: t('rbac.common.resource'), field: 'resource', align: 'left' as const },
  { name: 'actions', label: '', field: 'actions', align: 'right' as const },
])

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
    $q.notify({ type: 'positive', message: t('rbac.permissions.syncNotify', { created: res.data.created, rolesAssigned: res.data.rolesAssigned }) })
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? t('rbac.permissions.syncFailed') })
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
      $q.notify({ type: 'positive', message: t('rbac.permissions.updated') })
    } else {
      if (!form.value.code.trim()) return
      await apiRbac.createPermission(form.value)
      $q.notify({ type: 'positive', message: t('rbac.permissions.created') })
    }
    dialog.value = false
    await load()
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.response?.data?.message ?? t('rbac.common.error') })
  } finally {
    saving.value = false
  }
}

function confirmDelete(perm: RbacPermission) {
  $q.dialog({
    title: t('rbac.permissions.deleteTitle'),
    message: t('rbac.permissions.deleteMessage', { name: perm.name }),
    cancel: true,
    ok: { color: 'negative', label: t('rbac.common.delete') },
  }).onOk(async () => {
    try {
      await apiRbac.deletePermission(perm.id)
      $q.notify({ type: 'positive', message: t('rbac.common.deleted') })
      await load()
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.response?.data?.message ?? t('rbac.common.deleteFailed') })
    }
  })
}

onMounted(load)
</script>
