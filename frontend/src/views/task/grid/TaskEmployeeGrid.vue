<template>
  <div class="task-employee-grid">
    <q-card>
      <q-card-section>
        <!-- Search and Filter Bar -->
        <div class="row items-center q-mb-md">
          <div class="col-12 col-md-4">
            <q-input 
              v-model="searchText" 
              dense 
              outlined 
              label="Search Employees" 
              clearable
              @update:model-value="onSearch"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-3 q-ml-md">
            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              label="Status Filter"
              dense
              outlined
              clearable
              emit-value
              map-options
              @update:model-value="onSearch"
            />
          </div>
          <div class="col">
            <q-space />
          </div>
          <div>
            <q-btn color="primary" icon="refresh" flat round @click="loadGridData" />
          </div>
        </div>
        
        <!-- Data Grid -->
        <GridDefault
          :rowData="rowData"
          :columnDefs="columnDefs"
          :gridOptions="gridOptions"
          @grid-ready="loadGridData"
        />
        
        <!-- Pagination (if needed) -->
        <div class="row justify-end q-mt-md" v-if="totalItems > 0">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            :max-pages="5"
            boundary-numbers
            direction-links
            @update:model-value="onPageChange"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import GridDefault from '@/components/grid/GridDefault.vue'
import apiTask, { TaskEmployee } from '@/api/modules/api-task'

const props = defineProps<{
  taskId: number
}>()

const emit = defineEmits<{
  (e: 'employee-selected', employee: TaskEmployee): void
}>()

const $q = useQuasar()

// Data and pagination state
const rowData = ref<TaskEmployee[]>([])
const searchText = ref('')
const statusFilter = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const totalPages = ref(1)

// Status filter options
const statusOptions = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
]

const columnDefs = ref([
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'accountId', headerName: 'Account ID', width: 120 },
  { field: 'accountName', headerName: 'Name', width: 150 },
  { field: 'accountEmail', headerName: 'Email', width: 180 },
  { field: 'status', headerName: 'Status', width: 120 },
  { field: 'taskTitle', headerName: 'Task Title', width: 150 },
  { field: 'taskStatus', headerName: 'Task Status', width: 120 },
  { 
    field: 'requestDate', 
    headerName: 'Request Date', 
    width: 160,
    valueFormatter: (params: any) => formatDateTime(params.value)
  },
  { 
    field: 'approvedAt', 
    headerName: 'Approved At', 
    width: 160,
    valueFormatter: (params: any) => formatDateTime(params.value)
  },
  { 
    field: 'rejectedAt', 
    headerName: 'Rejected At', 
    width: 160,
    valueFormatter: (params: any) => formatDateTime(params.value)
  },
  { field: 'rejectionReason', headerName: 'Rejection Reason', width: 180 },
  { 
    field: 'joinedAt', 
    headerName: 'Joined At', 
    width: 160,
    valueFormatter: (params: any) => formatDateTime(params.value)
  },
  { 
    field: 'leftAt', 
    headerName: 'Left At', 
    width: 160,
    valueFormatter: (params: any) => formatDateTime(params.value)
  }
])

// Grid options with row click handler
const gridOptions = ref({
  onRowClicked: (params: any) => {
    console.log('Employee row clicked:', params);
    emit('employee-selected', params.data);
  },
  rowStyle: { cursor: 'pointer' },
  pagination: true,
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true
  }
})

// Helper function to format dates
const formatDateTime = (dateTimeString: string | null) => {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  return date.toLocaleString();
};

// Search and filter handler
const onSearch = () => {
  currentPage.value = 1; // Reset to first page on search
  loadGridData();
}

// Page change handler
const onPageChange = () => {
  loadGridData();
}

const loadGridData = async () => {
  try {
    // Build query parameters for filtering and pagination
    const params: any = {
      page: currentPage.value - 1, // API uses 0-based indexing
      size: pageSize.value
    };
    
    // Add search text if provided
    if (searchText.value) {
      params.search = searchText.value;
    }
    
    // Add status filter if selected
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }
    
    // Call API with task ID and additional params
    const response = await apiTask.getTaskEmployees(props.taskId, params);
    
    // Update data and pagination info
    if (response.data.content) {
      // If paginated response
      rowData.value = response.data.content;
      totalItems.value = response.data.totalElements || 0;
      totalPages.value = response.data.totalPages || 1;
    } else {
      // If array response
      rowData.value = response.data;
      totalItems.value = response.data.length;
      totalPages.value = Math.ceil(response.data.length / pageSize.value);
    }
  } catch (error) {
    console.error('Error loading task employees:', error);
    $q.notify({type: 'negative', message: 'Failed to load task employees'});
    rowData.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
  }
}

// Watch for changes in taskId and reload data
watch(() => props.taskId, (newTaskId) => {
  if (newTaskId) {
    currentPage.value = 1; // Reset to first page
    searchText.value = ''; // Clear search
    statusFilter.value = null; // Clear filter
    loadGridData();
  }
})

onMounted(() => {
  if (props.taskId) {
    loadGridData();
  }
})
</script>

<script lang="ts">
export default {
  name: 'TaskEmployeeGrid'
}
</script>

<style scoped>
.task-employee-grid {
  width: 100%;
}
</style> 