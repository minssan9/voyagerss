<template>
  <div class="q-mb-md">
    <div class="text-h6">{{ t('team.manage.teamMembers', 'Team Members') }}</div>
    <div class="ag-theme-alpine" style="height: 400px; width: 100%;">
      <GridDefault
        :columnDefs="memberColumnDefs"
        :rowData="members"
        @grid-ready="$emit('grid-ready')"
        @row-clicked="handleRowClicked"
        class="ag-theme-alpine-dark"
      />
      <Pagination
        :total-items="totalCount"
        :initial-page="pageRequest.page + 1"
        :initial-page-size="pageRequest.size"
        @page-change="$emit('page-change', $event)"
      />
    </div>
    <MemberDialog
      v-if="selectedMember"
      v-model="isDialogOpen"
      :member="selectedMember"
      @update:modelValue="val => { isDialogOpen = val; if (!val) selectedMember = null }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GridDefault from '@/components/grid/GridDefault.vue'
import Pagination from '@/components/common/Pagination.vue'
import MemberDialog from '@/components/dialog/MemberDialog.vue'

const { t } = useI18n()
const props = defineProps<{
  teamId: number
  members: any[]
  totalCount: number
  pageRequest: { page: number; size: number; sort?: string }
}>()

const memberColumnDefs = computed(() => [
  { headerName: 'Name', field: 'name', sortable: true, filter: true },
  { headerName: 'Email', field: 'email', sortable: true, filter: true },
  { headerName: 'Join Date', field: 'joinDate', sortable: true, filter: true },
  { headerName: 'Status', field: 'status', sortable: true, filter: true,
    cellRenderer: (params: any) => {
      const status = params.value
      const color = status === 'Active' ? 'green' : 'orange'
      return `<span style=\"color: ${color}\">${status}</span>`
    }
  }
])

const isDialogOpen = ref(false)
const selectedMember = ref<any | null>(null)

function handleRowClicked(event: any) {
  selectedMember.value = event.data
  isDialogOpen.value = true
}
</script>

<style scoped>
.ag-theme-alpine {
  width: 100%;
}
</style> 