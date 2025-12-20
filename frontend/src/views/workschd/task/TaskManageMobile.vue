<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Task Management</div>
      <q-btn
        color="primary"
        icon="add"
        label="Add Task"
        @click="openAddTaskDialog"
      />
    </div>

    <!-- Task List -->
    <q-list separator bordered class="rounded-borders">
      <q-item v-if="tasks.length === 0">
        <q-item-section class="text-center text-grey">
          No tasks found
        </q-item-section>
      </q-item>

      <q-item v-for="task in tasks" :key="task.id" clickable @click="openEditTaskDialog(task)">
        <q-item-section>
          <q-item-label class="text-weight-bold">{{ task.title }}</q-item-label>
          <q-item-label caption lines="2">{{ task.description }}</q-item-label>
          <div class="row items-center q-mt-xs text-caption text-grey">
            <q-icon name="store" size="xs" class="q-mr-xs" />
            <span>{{ task.shopName || 'No Shop' }}</span>
          </div>
          <div class="row items-center text-caption text-grey">
            <q-icon name="group" size="xs" class="q-mr-xs" />
            <span>Workers: {{ task.workerCount }}</span>
          </div>
          <div class="row items-center text-caption text-grey">
             <q-icon name="event" size="xs" class="q-mr-xs" />
             <span>{{ formatDateRange(task.startDateTime, task.endDateTime) }}</span>
          </div>
        </q-item-section>
        
        <q-item-section side>
          <q-chip
            :color="getTaskStatusColor(task.status)"
            text-color="white"
            dense
            size="sm"
          >
            {{ getTaskStatusLabel(task.status) }}
          </q-chip>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Task Form Dialog -->
    <q-dialog v-model="showTaskDialog" persistent>
      <q-card style="min-width: 350px; max-width: 500px;">
        <q-card-section>
          <div class="text-h6">{{ isEditMode ? 'Edit Task' : 'Register New Task' }}</div>    
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="handleSubmit">
            <!-- Title -->
            <q-input
              v-model="formData.title"
              label="Task Title *"
              outlined
              dense
              class="q-mb-md"
              :rules="[val => !!val || 'Title is required']"
            />

            <!-- Description -->
            <q-input
              v-model="formData.description"
              label="Description"
              outlined
              dense
              type="textarea"
              rows="3"
              class="q-mb-md"
            />

            <!-- Shop Selection -->
            <q-select
              v-model="formData.shopId"
              :options="shopOptions"
              label="Shop"
              outlined
              dense
              emit-value
              map-options
              class="q-mb-md"
            />

            <!-- Worker Count -->
            <q-input
              v-model.number="formData.workerCount"
              label="Required Workers *"
              outlined
              dense
              type="number"
              min="1"
              class="q-mb-md"
              :rules="[val => val > 0 || 'At least 1 worker required']"
            />

            <!-- Date Range -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <q-input
                  v-model="startDate"
                  label="Start Date *"
                  outlined
                  dense
                  type="date"
                  :rules="[val => !!val || 'Start date required']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="endDate"
                  label="End Date *"
                  outlined
                  dense
                  type="date"
                  :rules="[val => !!val || 'End date required']"
                />
              </div>
            </div>

            <!-- Time Range -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <q-input
                  v-model="startTime"
                  label="Start Time *"
                  outlined
                  dense
                  type="time"
                  :rules="[val => !!val || 'Start time required']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="endTime"
                  label="End Time *"
                  outlined
                  dense
                  type="time"
                  :rules="[val => !!val || 'End time required']"
                />
              </div>
            </div>

            <!-- Status -->
            <q-select
              v-model="formData.status"
              :options="statusOptions"
              label="Status"
              outlined
              dense
              emit-value
              map-options
              class="q-mb-md"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey" v-close-popup @click="resetForm" />     
          <q-btn
            flat
            label="Save"
            color="primary"
            :loading="isSubmitting"
            @click="handleSubmit"
          />
          <q-btn
            v-if="isEditMode"
            flat
            label="Delete"
            color="negative"
            :loading="isSubmitting"
            @click="handleDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar, date } from 'quasar'
import { useUserStore } from '@/stores/common/store_user'
import { useTeamStore } from '@/stores/workschd/store_team'
import taskApi from '@/api/workschd/api-task'
import { Task, createDefaultTask } from '@/types/workschd/task'
import { TaskStatus, getTaskStatusLabel, getTaskStatusColor } from '@/types/workschd/status'

const $q = useQuasar()
const userStore = useUserStore()
const teamStore = useTeamStore()

// State
const tasks = ref<Task[]>([])
const showTaskDialog = ref(false)
const isEditMode = ref(false)
const isSubmitting = ref(false)

// Form data
const formData = ref<Task>(createDefaultTask(userStore.user?.teamId || 0))
const startDate = ref('')
const startTime = ref('')
const endDate = ref('')
const endTime = ref('')

// Shop options from team store
const shopOptions = computed(() => {
  return teamStore.shops.map(shop => ({
    label: shop.name,
    value: shop.id
  }))
})

// Status options
const statusOptions = [
  { label: 'Scheduled', value: TaskStatus.SCHEDULED },
  { label: 'In Progress', value: TaskStatus.IN_PROGRESS },
  { label: 'Completed', value: TaskStatus.COMPLETED },
  { label: 'Cancelled', value: TaskStatus.CANCELLED }
]

// Load tasks on mount
onMounted(async () => {
  await loadTasks()
  await teamStore.fetchShops()
})

// Load tasks
async function loadTasks() {
  try {
    const response = await taskApi.fetchTasks()
    tasks.value = Array.isArray(response.data) ? response.data : (response.data.content || [])
  } catch (error) {
    console.error('Error loading tasks:', error)
    $q.notify({ type: 'negative', message: 'Failed to load tasks.' })
  }
}

// Open add task dialog
function openAddTaskDialog() {
  isEditMode.value = false
  resetForm()
  showTaskDialog.value = true
}

// Open edit task dialog
function openEditTaskDialog(task: Task) {
  isEditMode.value = true
  formData.value = { ...task }

  // Parse startDateTime and endDateTime
  if (task.startDateTime) {
    const startDT = new Date(task.startDateTime)
    startDate.value = date.formatDate(startDT, 'YYYY-MM-DD')
    startTime.value = date.formatDate(startDT, 'HH:mm')
  }
  if (task.endDateTime) {
    const endDT = new Date(task.endDateTime)
    endDate.value = date.formatDate(endDT, 'YYYY-MM-DD')
    endTime.value = date.formatDate(endDT, 'HH:mm')
  }

  showTaskDialog.value = true
}

// Reset form
function resetForm() {
  formData.value = createDefaultTask(userStore.user?.teamId || 0)
  const now = new Date()
  startDate.value = date.formatDate(now, 'YYYY-MM-DD')
  startTime.value = '08:00'
  endDate.value = date.formatDate(now, 'YYYY-MM-DD')
  endTime.value = '17:00'
}

// Handle submit
async function handleSubmit() {
  // Combine date and time
  formData.value.startDateTime = `${startDate.value}T${startTime.value}:00`
  formData.value.endDateTime = `${endDate.value}T${endTime.value}:00`

  // Set teamId
  formData.value.teamId = userStore.user?.teamId || 0

  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      // Update existing task
      await taskApi.updateTask(formData.value)
      $q.notify({ type: 'positive', message: 'Task updated successfully.' })
    } else {
      // Create new task
      await taskApi.createTask(formData.value)
      $q.notify({ type: 'positive', message: 'Task created successfully.' })
    }

    showTaskDialog.value = false
    await loadTasks()
  } catch (error: any) {
    console.error('Error saving task:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Failed to save task.'
    })
  } finally {
    isSubmitting.value = false
  }
}

// Handle delete
async function handleDelete() {
  $q.dialog({
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this task?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    isSubmitting.value = true
    try {
      if (formData.value.id) {
        await taskApi.deleteTask(formData.value.id)
        $q.notify({ type: 'positive', message: 'Task deleted successfully.' })
        showTaskDialog.value = false
        await loadTasks()
      }
    } catch (error: any) {
      console.error('Error deleting task:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to delete task.'
      })
    } finally {
      isSubmitting.value = false
    }
  })
}

// Format date range
function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return '-'

  const startDate = date.formatDate(start, 'YYYY.MM.DD')
  const endDate = date.formatDate(end, 'YYYY.MM.DD')

  if (startDate === endDate) {
    return startDate
  }
  return `${startDate} - ${endDate}`
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


