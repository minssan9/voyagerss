<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">장례식 업무 관리</div>
      <q-btn
        color="primary"
        icon="add"
        label="새 업무"
        unelevated
        @click="openAddTaskDialog"
      />
    </div>

    <!-- Task List -->
    <q-list bordered separator>
      <q-item
        v-for="task in tasks"
        :key="task.id"
        clickable
        v-ripple
        @click="openEditTaskDialog(task)"
        class="q-py-md"
      >
        <q-item-section>
          <q-item-label class="text-subtitle1 text-weight-medium">
            {{ task.title }}
          </q-item-label>
          <q-item-label caption lines="2">
            {{ task.description }}
          </q-item-label>
          <div class="row items-center q-mt-xs">
            <q-icon name="event" size="xs" class="q-mr-xs" />
            <span class="text-caption">{{ formatDateRange(task.startDateTime, task.endDateTime) }}</span>
          </div>
          <div class="row items-center q-mt-xs">
            <q-icon name="schedule" size="xs" class="q-mr-xs" />
            <span class="text-caption">{{ formatTimeRange(task.startDateTime, task.endDateTime) }}</span>
          </div>
          <div class="row items-center q-mt-xs">
            <q-icon name="store" size="xs" class="q-mr-xs" />
            <span class="text-caption">{{ task.shopName || '장례식장 미지정' }}</span>
          </div>
          <div class="row items-center q-mt-xs">
            <q-icon name="group" size="xs" class="q-mr-xs" />
            <span class="text-caption">필요 인원: {{ task.workerCount }}명</span>
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
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Empty State -->
    <div v-if="tasks.length === 0" class="text-center q-pa-xl">
      <q-icon name="inbox" size="64px" color="grey-5" />
      <div class="text-grey-7 q-mt-md">등록된 업무가 없습니다</div>
    </div>

    <!-- Task Form Dialog -->
    <q-dialog v-model="showTaskDialog" persistent>
      <q-card style="min-width: 350px; max-width: 500px;">
        <q-card-section>
          <div class="text-h6">{{ isEditMode ? '업무 수정' : '새 업무 등록' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="handleSubmit">
            <!-- Title -->
            <q-input
              v-model="formData.title"
              label="업무명 *"
              outlined
              dense
              class="q-mb-md"
              :rules="[val => !!val || '업무명을 입력하세요']"
            />

            <!-- Description -->
            <q-input
              v-model="formData.description"
              label="설명"
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
              label="장례식장"
              outlined
              dense
              emit-value
              map-options
              class="q-mb-md"
            />

            <!-- Worker Count -->
            <q-input
              v-model.number="formData.workerCount"
              label="필요 인원 *"
              outlined
              dense
              type="number"
              min="1"
              class="q-mb-md"
              :rules="[val => val > 0 || '최소 1명 이상 필요합니다']"
            />

            <!-- Date Range -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <q-input
                  v-model="startDate"
                  label="시작일 *"
                  outlined
                  dense
                  type="date"
                  :rules="[val => !!val || '시작일을 선택하세요']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="endDate"
                  label="종료일 *"
                  outlined
                  dense
                  type="date"
                  :rules="[val => !!val || '종료일을 선택하세요']"
                />
              </div>
            </div>

            <!-- Time Range -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <q-input
                  v-model="startTime"
                  label="시작 시간 *"
                  outlined
                  dense
                  type="time"
                  :rules="[val => !!val || '시작 시간을 선택하세요']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="endTime"
                  label="종료 시간 *"
                  outlined
                  dense
                  type="time"
                  :rules="[val => !!val || '종료 시간을 선택하세요']"
                />
              </div>
            </div>

            <!-- Status -->
            <q-select
              v-model="formData.status"
              :options="statusOptions"
              label="상태"
              outlined
              dense
              emit-value
              map-options
              class="q-mb-md"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="grey" v-close-popup @click="resetForm" />
          <q-btn
            flat
            label="저장"
            color="primary"
            :loading="isSubmitting"
            @click="handleSubmit"
          />
          <q-btn
            v-if="isEditMode"
            flat
            label="삭제"
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
import { useUserStore } from '@/stores/modules/store_user'
import { useTeamStore } from '@/stores/modules/store_team'
import taskApi from '@/api/modules/api-task'
import { Task, createDefaultTask } from '@/types'
import { TaskStatus, getTaskStatusLabel, getTaskStatusColor } from '@/types/status'

const $q = useQuasar()
const userStore = useUserStore()
const teamStore = useTeamStore()

// State
const tasks = ref<Task[]>([])
const showTaskDialog = ref(false)
const isEditMode = ref(false)
const isSubmitting = ref(false)

// Form data
const formData = ref<Task>(createDefaultTask(userStore.user.teamId))
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
  { label: '예정됨', value: TaskStatus.SCHEDULED },
  { label: '진행중', value: TaskStatus.IN_PROGRESS },
  { label: '완료됨', value: TaskStatus.COMPLETED },
  { label: '취소됨', value: TaskStatus.CANCELLED }
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
    tasks.value = Array.isArray(response.data) ? response.data : response.data.content || []
  } catch (error) {
    console.error('Error loading tasks:', error)
    $q.notify({ type: 'negative', message: '업무 목록을 불러오는데 실패했습니다.' })
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
  formData.value = createDefaultTask(userStore.user.teamId)
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
  formData.value.teamId = userStore.user.teamId

  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      // Update existing task
      await taskApi.updateTask(formData.value)
      $q.notify({ type: 'positive', message: '업무가 수정되었습니다.' })
    } else {
      // Create new task
      await taskApi.createTask(formData.value)
      $q.notify({ type: 'positive', message: '업무가 등록되었습니다.' })
    }

    showTaskDialog.value = false
    await loadTasks()
  } catch (error: any) {
    console.error('Error saving task:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || '업무 저장에 실패했습니다.'
    })
  } finally {
    isSubmitting.value = false
  }
}

// Handle delete
async function handleDelete() {
  $q.dialog({
    title: '삭제 확인',
    message: '이 업무를 삭제하시겠습니까?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    isSubmitting.value = true
    try {
      await taskApi.deleteTask(formData.value.id!)
      $q.notify({ type: 'positive', message: '업무가 삭제되었습니다.' })
      showTaskDialog.value = false
      await loadTasks()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || '업무 삭제에 실패했습니다.'
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

// Format time range
function formatTimeRange(start?: string, end?: string): string {
  if (!start || !end) return '-'

  const startTime = date.formatDate(start, 'HH:mm')
  const endTime = date.formatDate(end, 'HH:mm')

  return `${startTime} - ${endTime}`
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
