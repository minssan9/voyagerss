<template>
  <q-page padding class="page-container">
    <div class="row justify-between items-center q-mb-md">
      <h5 class="q-my-none">Task List of Today</h5>
      <q-btn color="primary" label="Add New Task" @click="openAddTaskDialog" />
    </div>

    <div class="content-section q-pa-md q-mb-md">
      <GridDefault
        :rowData="rowData"
        :columnDefs="columnDefs"
        :gridOptions="gridOptions"
        @grid-ready="loadGridData"
        @row-clicked="handleRowClicked"
      />
    </div>

    <!-- Task Dialog - Combined functionality for all dialog types -->
    <TaskDialog
      v-model="showTaskDialog"
      :task="selectedTask"
      :shops="shops"
      :requests="selectedTaskRequests"
      :isSubmitting="isSubmitting"
      @submit="handleTaskUpdate"
      @add="handleTaskSubmit"
      @join-request="confirmJoinRequest"
      @cancel="confirmCancel"
      @approve="handleApproveRequest"
    />

    <!-- Calendar View Section -->
    <div class="content-section q-pa-md q-mb-md">
      <div class="row items-center q-mb-sm">
        <q-btn-toggle
          v-model="calendarView"
          :options="[
            { label: 'Weekly', value: 'week' },
            { label: 'Monthly', value: 'month' }
          ]"
          color="primary"
          dense
          unelevated
          class="q-mr-md"
        />
        <q-btn color="secondary" label="Auto-Schedule" @click="autoSchedule" flat dense />
        <q-btn color="secondary" label="Shift Templates" @click="showTemplateDialog = true" flat dense class="q-ml-sm" />
      </div>
      <q-banner v-if="hasConflict" class="bg-red-2 text-red-10 q-mb-md">
        <q-icon name="warning" color="red" class="q-mr-sm" />
        Conflict detected: Overlapping shifts or availability violation.
      </q-banner>
      <div class="calendar-container q-mb-md">
        <!-- Stub: Calendar grid, replace with real calendar later -->
        <div class="row q-col-gutter-sm">
          <div v-for="day in calendarDays" :key="day" class="col">
            <q-card flat bordered class="q-pa-sm bg-grey-1">
              <div class="text-caption text-grey-7">{{ day }}</div>
              <div v-for="task in getTasksForDay(day)" :key="task.id" class="q-mt-xs">
                <q-chip
                  color="primary"
                  text-color="white"
                  class="q-mb-xs drag-task"
                  draggable
                  @dragstart="onDragStart(task, day)"
                  @drop.prevent="onDrop(task, day)"
                >
                  {{ task.title }}
                </q-chip>
              </div>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- Shift Template Dialog (stub) -->
    <q-dialog v-model="showTemplateDialog">
      <q-card style="min-width:300px">
        <q-card-section>
          <div class="text-h6">Select Shift Template</div>
          <q-list>
            <q-item v-for="template in shiftTemplates" :key="template.id" clickable @click="applyTemplate(template)">
              <q-item-section>{{ template.name }}</q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import GridDefault from '@/components/grid/GridDefault.vue'
import TaskEmployeeGrid from '@/views/task/grid/TaskEmployeeGrid.vue'
import TaskDialog from '@/views/task/dialog/TaskDialog.vue'

import { useUserStore } from '@/stores/modules/store_user'
import { useTeamStore } from '@/stores/modules/store_team'

import apiTask from '@/api/modules/api-task'

// Import the types and correct status enums from the types directory
import { Task, TaskEmployee, JoinRequest, Shop, createDefaultTask } from '@/types'
import { TaskStatus, RequestStatus } from '@/types/status'

const $q = useQuasar()
const { t } = useI18n()
const userStore = useUserStore()
const teamStore = useTeamStore()

const tasks = ref<Task[]>([])
const newTask = ref<Task>(createDefaultTask(userStore.user.teamId))

const handleReset = () => {
  newTask.value = createDefaultTask(userStore.user.teamId)
}

// Get shops from the teamStore instead of shopStore
const shops = computed(() => teamStore.shops)

const rowData = ref([])
const columnDefs = ref([
  { 
    field: 'id', 
    headerName: 'Task',
    cellRenderer: (params) => {
      return `<div class="clickable-cell">${params.value}</div>`;
    },
    onCellClicked: (params) => {
      selectedTask.value = params.data;
      activeTab.value = 'details';
    }
  },
  { field: 'shopName', headerName: 'Shop' }, 
  { field: 'teamName', headerName: 'Team' },
  { field: 'title', headerName: 'Title' },
  { field: 'description', headerName: 'Description' },
  { field: 'workerCount', headerName: 'Worker Count' },
  { field: 'startDateTime', headerName: 'Start Date & Time' },
  { field: 'endDateTime', headerName: 'End Date & Time' },
  { field: 'status', headerName: 'Status' },
  { field: 'active', headerName: 'Active' }
])

const showAddDialog = ref(false)
const showTaskDialog = ref(false)
const showAddEmployeeDialog = ref(false)
const approvalDialogVisible = ref(false)
const selectedTaskRequests = ref<JoinRequest[]>([])
const selectedTask = ref<Task | null>(null)
const selectedEmployee = ref<TaskEmployee | null>(null)
const activeTab = ref('details')
const isSubmitting = ref(false)

// Grid options without row click handler
const gridOptions = ref({
  rowStyle: { cursor: 'pointer' }
})

function handleRowClicked(params: any) {
  selectedTask.value = params.data;
  showTaskDialog.value = true;
}

const onSubmit = async () => {
  try {
    await apiTask.createTask(newTask.value)
    await loadGridData()
    handleReset()
    showAddDialog.value = false
    
    $q.notify({type: 'positive', message: 'Task registered successfully'})
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to register task'})
  }
}

const handleApproveRequest = async (request: JoinRequest) => {
  try {
    // Convert JoinRequest to TaskEmployee if needed by the API
    const taskEmployee: TaskEmployee = {
      id: request.id,
      taskId: request.taskId,
      accountId: request.accountId,
      status: request.status,
      // Required by TaskEmployee interface but not used in approval
      content: '',
      description: '',
      size: 0
    };
    
    await apiTask.approveJoinRequest(taskEmployee)
    
    $q.notify({type: 'positive', message: 'Request approved successfully'})
    
    selectedTaskRequests.value = selectedTaskRequests.value.filter(r => r.id !== request.id)
    
    if (selectedTaskRequests.value.length === 0) {
      approvalDialogVisible.value = false
    }
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to approve request'})
  }
}

const loadGridData = async () => {
  try {
    // Fallback: if response.data is not an array, use empty array
    const response = await apiTask.fetchTasks()
    rowData.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to fetch tasks'})
  }
}

const formatDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return 'N/A';
  const date = new Date(dateTimeString);
  return date.toLocaleString();
};

const handleTaskSubmit = async (newTaskData: Task) => {
  try {
    isSubmitting.value = true
    await apiTask.createTask(newTaskData)
    await loadGridData()
    showTaskDialog.value = false
    
    $q.notify({type: 'positive', message: 'Task registered successfully'})
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to register task'})
  } finally {
    isSubmitting.value = false
  }
}

const handleTaskUpdate = async (updatedTask: Task) => {
  try {
    await apiTask.updateTask(updatedTask)
    await loadGridData()
    showTaskDialog.value = false
    
    // Update the selected task with the updated data
    if (selectedTask.value && selectedTask.value.id === updatedTask.id) {
      selectedTask.value = updatedTask
    }
    
    $q.notify({type: 'positive', message: 'Task updated successfully'})
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to update task'})
  }
}

// Function to handle join requests from TaskDialog
const confirmJoinRequest = async (task: Task) => {
  if (!task || !userStore.user?.accountId) return;
  
  try {
    const requestData: Partial<TaskEmployee> = {
      taskId: task.id!,
      accountId: Number(userStore.user.accountId),
      status: RequestStatus.PENDING
    };
    
    await apiTask.createTaskEmployeeRequest(requestData);
    $q.notify({type: 'positive', message: 'Join request submitted successfully'});
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to submit join request'});
  }
}

// Function to handle task cancellation from TaskDialog
const confirmCancel = async (task: Task) => {
  if (!task || !task.id) return;
  
  try {
    // First change task status to cancelled
    const updatedTask = { ...task, status: TaskStatus.CANCELLED };
    await apiTask.updateTask(updatedTask);
    
    // Refresh task list and update selected task
    await loadGridData();
    if (selectedTask.value && selectedTask.value.id === task.id) {
      selectedTask.value = updatedTask;
    }
    
    $q.notify({type: 'positive', message: 'Task cancelled successfully'});
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to cancel task'});
  }
}

const fetchTasks = async () => {
  try {
    const response = await apiTask.fetchTasks()
    tasks.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    $q.notify({type: 'negative', message: 'Failed to fetch tasks'})
  }
}

const calendarView = ref<'week' | 'month'>('week')
const showTemplateDialog = ref(false)
const hasConflict = ref(false)
const shiftTemplates = ref([
  { id: 1, name: 'Morning Shift (8am-12pm)' },
  { id: 2, name: 'Afternoon Shift (1pm-5pm)' },
  { id: 3, name: 'Full Day (8am-5pm)' }
])
const calendarDays = computed(() => calendarView.value === 'week'
  ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  : Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`)
)
function getTasksForDay(day: string) {
  // Stub: filter tasks by day (replace with real logic)
  return tasks.value.filter((_, idx) => idx % 7 === calendarDays.value.indexOf(day))
}
function onDragStart(task: any, day: string) {
  // Stub: handle drag start
}
function onDrop(task: any, day: string) {
  // Stub: handle drop, set hasConflict if needed
  hasConflict.value = Math.random() > 0.7 // Randomly simulate conflict
}
function autoSchedule() {
  // Stub: auto-scheduling logic
  $q.notify({ type: 'info', message: 'Auto-scheduling (stub)' })
}
function applyTemplate(template: any) {
  // Stub: apply shift template
  $q.notify({ type: 'info', message: `Applied template: ${template.name}` })
  showTemplateDialog.value = false
}

// Replace loadShops with using the team store's loadShops
const loadTeamShops = async () => {
  try {
    await teamStore.loadShops()
    if (teamStore.error) {
      $q.notify({type: 'negative', message: teamStore.error})
    }
  } catch (error) {
    console.error('Error loading shops:', error)
  }
}

// Open add task dialog via the combined TaskDialog
const openAddTaskDialog = () => {
  // Create a new empty task with default values
  selectedTask.value = {
    title: '',
    description: '',
    workerCount: 1,
    startDateTime: new Date().toISOString().split('.')[0],
    endDateTime: new Date(Date.now() + 3600000).toISOString().split('.')[0], // 1 hour later
    status: TaskStatus.SCHEDULED,
    teamId: userStore.user?.teamId || 0,
    shopId: null,
    active: true,
    taskEmployees: []
  }
  
  // Open the dialog in add mode
  showTaskDialog.value = true
}

onMounted(async () => {
  loadGridData() 
  fetchTasks()
  loadTeamShops() // Load shops using the team store
})
</script>

<style scoped>
.detail-card {
  height: 100%;
  transition: all 0.3s ease;
}

.detail-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.detail-item {
  margin-bottom: 12px;
}

.detail-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 1rem;
  font-weight: 500;
}

.description {
  white-space: pre-line;
  max-height: 150px;
  overflow-y: auto;
}

.clickable-cell {
  cursor: pointer;
  color: var(--q-primary);
  text-decoration: underline;
}

/* Make the form elements more visually appealing */
:deep(.q-field) {
  margin-bottom: 16px;
}

:deep(.q-field__label) {
  font-weight: 500;
}

:deep(.q-field--filled .q-field__control) {
  border-radius: 8px;
}

:deep(.q-btn) {
  border-radius: 8px;
  padding: 8px 24px;
}
</style>


