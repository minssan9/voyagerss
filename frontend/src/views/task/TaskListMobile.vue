<template>
  <q-page class="q-pa-md">
    <!-- View Toggle (List/Calendar) -->
    <div class="row items-center q-mb-md">
      <q-btn-toggle
        v-model="viewMode"
        :options="[
          { label: '목록', value: 'list' },
          { label: '캘린더', value: 'calendar' }
        ]"
        color="primary"
        dense
        unelevated
        class="q-mr-md"
      />
      <q-btn-toggle
        v-model="requestFilter"
        :options="[
          { label: '전체 작업', value: 'all' },
          { label: '내 신청', value: 'mine' }
        ]"
        color="secondary"
        dense
        unelevated
      />
    </div>

    <!-- Calendar View (stub) -->
    <div v-if="viewMode === 'calendar'" class="q-mb-md">
      <q-banner class="bg-grey-2 text-grey-8 q-mb-md">
        <q-icon name="event" class="q-mr-sm" />
        캘린더 뷰는 곧 제공됩니다. (Stub)
      </q-banner>
      <!-- Replace with real calendar later -->
      <div class="row q-col-gutter-sm">
        <div v-for="day in 7" :key="day" class="col">
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="text-caption text-grey-7">Day {{ day }}</div>
            <div v-for="task in tasksForCalendar(day)" :key="task.id" class="q-mt-xs">
              <q-chip color="primary" text-color="white" class="q-mb-xs">{{ task.title }}</q-chip>
            </div>
          </q-card>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else>
      <!-- Search and Filter Bar -->
      <div class="q-mb-md">
        <q-input v-model="searchQuery" outlined dense placeholder="작업 검색" class="q-mb-sm">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
        <div class="row q-col-gutter-sm">
          <div class="col-12 text-subtitle1 q-mb-xs">상태 필터</div>
          <div class="col-auto">
            <q-chip
              clickable
              :color="statusFilter === '' ? 'primary' : 'grey-4'"
              :text-color="statusFilter === '' ? 'white' : 'black'"
              @click="statusFilter = ''"
              dense
            >
              전체
            </q-chip>
          </div>
          <div v-for="status in statusOptions" :key="status.value" class="col-auto">
            <q-chip
              clickable
              :color="statusFilter === status.value ? 'primary' : 'grey-4'"
              :text-color="statusFilter === status.value ? 'white' : 'black'"
              @click="statusFilter = status.value"
              dense
            >
              {{ status.label }}
            </q-chip>
          </div>
        </div>
      </div>

      <!-- Tasks List (with Quasar grid) -->
      <div class="q-mb-md">
        <q-list bordered separator>
          <q-item 
            v-for="task in filteredTasksForView" 
            :key="task.id" 
            clickable 
            v-ripple
            @click="showTaskDetails(task)"
            class="q-py-md"
          >
            <q-item-section>
              <q-item-label class="text-subtitle1 text-weight-medium">{{ task.title }}</q-item-label>
              <q-item-label caption lines="2">{{ task.description }}</q-item-label>
              <div class="row items-center q-mt-xs">
                <q-icon name="event" size="xs" class="q-mr-xs" />
                <span class="text-caption">{{ formatDateRange(task.startDateTime, task.endDateTime) }}</span>
              </div>
              <div class="row items-center q-mt-xs">
                <q-icon name="accountWorkHour" size="xs" class="q-mr-xs" />
                <span class="text-caption">{{ formatTimeRange(task.startDateTime, task.endDateTime) }}</span>
              </div>
              <div class="row items-center q-mt-xs">
                <q-icon name="store" size="xs" class="q-mr-xs" />
                <span class="text-caption">{{ task.shopName || 'N/A' }}</span>
              </div>
              <div class="row items-center q-mt-xs">
                <q-icon name="group" size="xs" class="q-mr-xs" />
                <span class="text-caption">Team: {{ task.teamName || 'N/A' }}</span>
              </div>
              <div class="row items-center q-mt-xs">
                <q-icon name="group" size="xs" class="q-mr-xs" />
                <span class="text-caption">현재 {{ task.taskEmployees?.length || 0 }}명 / 총 {{ task.workerCount }}명</span>
              </div>
            </q-item-section>
            <q-item-section side>
              <q-chip
                :color="getTaskStatusColor(task.status)"
                text-color="white"
                dense
              >
                {{ getTaskStatusLabel(task.status) }}
              </q-chip>
              <!-- Attendance buttons for approved tasks -->
              <div v-if="canCheckIn(task)" class="q-mt-sm">
                <q-btn
                  color="positive"
                  label="출근"
                  icon="login"
                  size="sm"
                  unelevated
                  @click.stop="handleCheckIn(task)"
                />
              </div>
              <div v-else-if="canCheckOut(task)" class="q-mt-sm">
                <q-btn
                  color="negative"
                  label="퇴근"
                  icon="logout"
                  size="sm"
                  unelevated
                  @click.stop="handleCheckOut(task)"
                />
                <div class="text-caption text-grey-7 q-mt-xs">
                  출근: {{ formatDateTime(getMyTaskEmployee(task)?.joinedAt) }}
                </div>
              </div>
              <!-- Join request button -->
              <q-btn
                v-else-if="canRequestToJoin(task)"
                color="primary"
                label="참여 신청"
                size="sm"
                flat
                class="q-mt-sm"
                @click.stop="confirmJoinRequest(task)"
              />
              <!-- Status chip for existing requests -->
              <q-chip
                v-else-if="getTaskRequestStatus(task.id)"
                :color="getRequestStatusColor(getTaskRequestStatus(task.id))"
                text-color="white"
                dense
                class="q-mt-sm"
              >
                {{ getRequestStatusLabel(getTaskRequestStatus(task.id)) }}
              </q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Pagination controls -->
      <div class="row justify-center q-mt-md">
        <q-pagination
          v-model="currentPage"
          :max="totalPages"
          direction-links
          boundary-links
          :max-pages="3"
          color="primary"
        />
      </div>
    </div>

    <!-- Consolidated Task Dialog -->
    <TaskDialog
      v-model="showTaskDialog"
      :task="selectedTask"
      :is-submitting="isSubmitting"
      @join-request="submitJoinRequest"
      @cancel="submitCancel"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar, date } from 'quasar'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/modules/store_user'
import taskApi from '@/api/modules/api-task'
import { 
  Task, 
  TaskEmployee,
  JoinRequest
} from '@/types'
import { 
  TaskStatus, 
  RequestStatus,
  getTaskStatusLabel, 
  getTaskStatusColor, 
  getRequestStatusLabel, 
  getRequestStatusColor 
} from '@/types/status'
import TaskDialog from '@/views/task/dialog/TaskDialog.vue'

const $q = useQuasar()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

// Pagination state
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(1)
const totalItems = ref(0)

// Query parameters for API calls
const queryParams = ref({
  page: 0,
  size: 10,
  search: undefined as string | undefined,
  status: undefined as string | undefined,
  accountId: undefined as number | undefined
})

// Tasks state
const tasks = ref<Task[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const userRequests = ref<any[]>([])

// Dialog state
const showTaskDialog = ref(false)
const selectedTask = ref<Task | null>(null)
const isSubmitting = ref(false)

// Status options for filtering
const statusOptions = [
  { label: '예정됨', value: TaskStatus.SCHEDULED },
  { label: '진행중', value: TaskStatus.IN_PROGRESS },
  { label: '완료됨', value: TaskStatus.COMPLETED },
  { label: '취소됨', value: TaskStatus.CANCELLED }
]

// View mode toggle (list/calendar)
const viewMode = ref<'list' | 'calendar'>('list')
// Request filter (all/mine)
const requestFilter = ref<'all' | 'mine'>('all')

// Load tasks and user's task requests
onMounted(async () => {
  updateQueryParams()
  await loadTasks()
  if (user.value?.accountId) {
    await loadUserTaskRequests()
  }
})

// Watch for filter/search changes to update tasks
watch([currentPage, searchQuery, statusFilter], async () => {
  updateQueryParams()
  await loadTasks()
})

// Update query parameters based on current filters and pagination
function updateQueryParams() {
  queryParams.value = {
    page: currentPage.value - 1,
    size: pageSize.value,
    search: searchQuery.value || undefined,
    status: statusFilter.value || undefined,
    accountId: user.value?.accountId ? Number(user.value.accountId) : undefined
  }
}

// Load tasks with pagination and filtering
async function loadTasks() {
  isLoading.value = true
  try {
    const response = await taskApi.fetchTasksForWorker(queryParams.value)
    
    // Use type assertion for response.data
    const data = response.data as any
    
    if (data?.content) {
      // Paginated response
      tasks.value = data.content
      totalItems.value = data.totalElements || 0
      totalPages.value = data.totalPages || 1
    } else {
      // Direct array response
      tasks.value = Array.isArray(data) ? data : []
      totalPages.value = 1
    }
  } catch (error) {
    console.error('Error loading tasks:', error)
    $q.notify({ type: 'negative', message: '작업 목록을 불러오는데 실패했습니다.' })
    tasks.value = []
  } finally {
    isLoading.value = false
  }
}

// Load user's task requests
async function loadUserTaskRequests() {
  try {
    const response = await taskApi.fetchTasksForWorker(queryParams.value)
    
    // Use type assertion for response.data
    const data = response.data as any
    
    if (data?.content) {
      userRequests.value = data.content
    } else {
      userRequests.value = Array.isArray(data) ? data : []
    }
  } catch (error) {
    console.error('Error loading user task requests:', error)
  }
}

// Show task details
function showTaskDetails(task: Task) {
  selectedTask.value = task
  showTaskDialog.value = true
}

// Confirm join request
function confirmJoinRequest(task: Task) {
  selectedTask.value = task
  showTaskDialog.value = true
}

// Submit join request
async function submitJoinRequest(task: Task) {
  if (!task || !task.id || !user.value?.accountId) return

  isSubmitting.value = true
  try {
    const requestData: Partial<TaskEmployee> = {
      taskId: task.id,
      accountId: Number(user.value.accountId),
      status: RequestStatus.PENDING
    }

    await taskApi.createTaskEmployeeRequest(requestData)
    $q.notify({ type: 'positive', message: '작업 참여 신청이 완료되었습니다.' })
    showTaskDialog.value = false
    
    // Reload user's task requests to update UI
    if (user.value?.accountId) {
      await loadUserTaskRequests()
    }
  } catch (error) {
    console.error('Error submitting join request:', error)
    $q.notify({ type: 'negative', message: '작업 참여 신청에 실패했습니다.' })
  } finally {
    isSubmitting.value = false
  }
}

// Check if user can request to join a task
function canRequestToJoin(task: Task | null): boolean {
  if (!task || !task.id || !user.value?.accountId) return false

  // User can't request if task is not scheduled or in progress
  if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) return false

  // User can't request if already at capacity
  if (task.taskEmployees && task.taskEmployees.length >= task.workerCount) return false

  // User can't request if already has a request for this task
  return !getTaskRequestStatus(task.id)
}

// Get request status for a task if it exists
function getTaskRequestStatus(taskId: number | undefined): string | null {
  if (!taskId) return null
  const request = userRequests.value.find(req => req.taskId === taskId)
  return request ? request.status : null
}

// Helper function to format date range
function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return '-'
  
  const startDate = date.formatDate(start, 'YYYY.MM.DD')
  const endDate = date.formatDate(end, 'YYYY.MM.DD')
  
  if (startDate === endDate) {
    return startDate
  }
  return `${startDate} - ${endDate}`
}

// Helper function to format time range
function formatTimeRange(start?: string, end?: string): string {
  if (!start || !end) return '-'
  
  const startTime = date.formatDate(start, 'HH:mm')
  const endTime = date.formatDate(end, 'HH:mm')
  
  return `${startTime} - ${endTime}`
}

// Filtered tasks for current view
const filteredTasksForView = computed(() => {
  if (requestFilter.value === 'mine') {
    // Show only tasks the user has requested
    return tasks.value.filter(task => getTaskRequestStatus(task.id))
  }
  return tasks.value
})

// Calendar stub: return tasks for a given day
function tasksForCalendar(day: number) {
  // Replace with real logic later
  return tasks.value.filter((_, idx) => idx % 7 === (day - 1))
}

// Handle task cancellation
const submitCancel = async (task: Task) => {
  if (!task || !task.id) return

  isSubmitting.value = true
  try {
    // Update task status to cancelled
    const updatedTask = { ...task, status: TaskStatus.CANCELLED }
    await taskApi.updateTask(updatedTask)
    showTaskDialog.value = false
    await loadTasks()
    $q.notify({ type: 'positive', message: '작업이 취소되었습니다.' })
  } catch (error) {
    console.error('Failed to cancel task:', error)
    $q.notify({ type: 'negative', message: '작업 취소에 실패했습니다.' })
  } finally {
    isSubmitting.value = false
  }
}

// Get current user's task employee record for a task
function getMyTaskEmployee(task: Task): TaskEmployee | null {
  if (!task.taskEmployees || !user.value?.accountId) return null
  return task.taskEmployees.find(te => te.accountId === Number(user.value.accountId)) || null
}

// Check if user can check in
function canCheckIn(task: Task): boolean {
  if (!task || !user.value?.accountId) return false
  const myTaskEmployee = getMyTaskEmployee(task)
  if (!myTaskEmployee) return false

  // Can check in if status is APPROVED or INACTIVE (previous check-out)
  return myTaskEmployee.status === RequestStatus.APPROVED || myTaskEmployee.status === 'INACTIVE'
}

// Check if user can check out
function canCheckOut(task: Task): boolean {
  if (!task || !user.value?.accountId) return false
  const myTaskEmployee = getMyTaskEmployee(task)
  if (!myTaskEmployee) return false

  // Can check out if status is ACTIVE
  return myTaskEmployee.status === 'ACTIVE'
}

// Handle check in
async function handleCheckIn(task: Task) {
  const myTaskEmployee = getMyTaskEmployee(task)
  if (!myTaskEmployee || !myTaskEmployee.id) return

  try {
    await taskApi.checkIn(myTaskEmployee.id)
    $q.notify({ type: 'positive', message: '출근 처리되었습니다.' })
    await loadTasks()
    await loadUserTaskRequests()
  } catch (error: any) {
    console.error('Check-in failed:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || '출근 처리에 실패했습니다.'
    })
  }
}

// Handle check out
async function handleCheckOut(task: Task) {
  const myTaskEmployee = getMyTaskEmployee(task)
  if (!myTaskEmployee || !myTaskEmployee.id) return

  try {
    await taskApi.checkOut(myTaskEmployee.id)
    $q.notify({ type: 'positive', message: '퇴근 처리되었습니다.' })
    await loadTasks()
    await loadUserTaskRequests()
  } catch (error: any) {
    console.error('Check-out failed:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || '퇴근 처리에 실패했습니다.'
    })
  }
}

// Format date time for display
function formatDateTime(dateTime?: string): string {
  if (!dateTime) return '-'
  return date.formatDate(dateTime, 'HH:mm')
}
</script>

<style scoped>
/* Responsive adjustments */
@media (max-width: 599px) {
  .q-page {
    padding: 12px !important;
  }
}
</style> 