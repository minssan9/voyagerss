<template>
  <q-dialog v-model="isOpen" :maximized="dialogMode === 'view'" persistent :transition-show="transitionShow" :transition-hide="transitionHide">
    <q-card :class="{
      'task-details-dialog': dialogMode === 'view',
      'dialog-card': dialogMode === 'add',
      'approval-dialog': dialogMode === 'approval'
    }">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <template v-if="dialogMode === 'view'">{{ task?.title }}</template>
          <template v-else-if="dialogMode === 'edit'">{{ t('task.edit', 'Edit Task') }}</template>
          <template v-else-if="dialogMode === 'add'">{{ t('task.register', 'Register New Task') }}</template>
          <template v-else-if="dialogMode === 'approval'">{{ t('task.approvalRequests', 'Approval Requests') }}</template>
          <template v-else-if="dialogMode === 'join'">{{ t('task.joinRequest', '작업 참여 신청') }}</template>
          <template v-else-if="dialogMode === 'cancel'">{{ t('task.cancelTask', '작업 취소') }}</template>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- UNIFIED FORM SECTION -->
      <template v-if="dialogMode !== 'approval' && dialogMode !== 'join' && dialogMode !== 'cancel'">
        <q-card-section class="q-pt-sm">
          <q-form @submit.prevent="handleFormSubmit" class="q-gutter-md">
            <div class="row q-col-gutter-md">
              <!-- Basic Info Card -->
              <div class="col-12 col-md-4">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-h6">{{ t('events.basicInfo', 'Basic Information') }}</div>
                    <q-separator class="q-my-sm" />
                    <div class="q-gutter-y-md">
                      <q-input
                        v-model="currentForm.title"
                        :label="t('task.title', 'Title')"
                        :disable="dialogMode === 'view'"
                        required
                        :rules="[val => !!val || t('validation.required', 'Field is required')]"
                      />
                      <q-select 
                        v-model="currentForm.shopId" 
                        :options="shopOptions" 
                        :label="t('task.shop', 'Shop')" 
                        :disable="dialogMode === 'view'"
                        emit-value 
                        map-options 
                        :rules="[val => val !== null || t('validation.required', 'Field is required')]" 
                      />
                      <q-select 
                        v-model="currentForm.status" 
                        :options="statusOptions" 
                        :label="t('task.status', 'Status')" 
                        :disable="dialogMode === 'view'"
                        required 
                        :rules="[val => !!val || t('validation.required', 'Field is required')]" 
                      />
                      <q-toggle 
                        v-model="currentForm.active" 
                        :label="t('task.active', 'Active')" 
                        :disable="dialogMode === 'view'" 
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Time & Assignment Card -->
              <div class="col-12 col-md-4">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-h6">{{ t('events.timeAndAssignment', 'Time & Assignment') }}</div>
                    <q-separator class="q-my-sm" />
                    <div class="q-gutter-y-md">
                      <q-input 
                        v-model="currentForm.startDateTime" 
                        type="datetime-local" 
                        :label="t('task.startDateTime', 'Start Date & Time')" 
                        :disable="dialogMode === 'view'"
                        required 
                        :rules="[val => !!val || t('validation.required', 'Field is required')]" 
                      />
                      <q-input 
                        v-model="currentForm.endDateTime" 
                        type="datetime-local" 
                        :label="t('task.endDateTime', 'End Date & Time')" 
                        :disable="dialogMode === 'view'"
                        required 
                        :rules="[val => !!val || t('validation.required', 'Field is required')]" 
                      />
                      <q-input 
                        v-model.number="currentForm.workerCount" 
                        type="number" 
                        min="1" 
                        :label="t('task.workerCount', 'Worker Count')" 
                        :disable="dialogMode === 'view'"
                        required 
                        :rules="[
                          val => !!val || t('validation.required', 'Field is required'),
                          val => val > 0 || t('validation.min', 'Must be greater than 0')
                        ]" 
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Description Card -->
              <div class="col-12 col-md-4">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-h6">{{ t('events.description', 'Description') }}</div>
                    <q-separator class="q-my-sm" />
                    <q-input
                      v-model="currentForm.description"
                      type="textarea"
                      :label="t('task.description', 'Description')"
                      :disable="dialogMode === 'view'"
                      rows="3"
                      autogrow
                    />
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <!-- Map Section -->
            <div class="row q-col-gutter-md q-mt-md">
              <div class="col-12">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-h6">{{ t('task.location', 'Location') }}</div>
                    <q-separator class="q-my-sm" />
                    <div id="map" style="height: 300px;"></div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="row justify-end q-mt-md">
              <template v-if="dialogMode === 'view'">
                <q-btn v-if="showJoinBtn" color="primary" :label="t('task.joinRequest', '참여 신청')" @click="showJoinRequestDialog" class="q-mr-md" />
                <q-btn v-if="showEditBtn" color="secondary" :label="t('task.edit', '편집')" @click="dialogMode = 'edit'" class="q-mr-md" />
                <q-btn v-if="showApprovalBtn" color="info" :label="t('task.approveRequests', '승인 요청')" @click="dialogMode = 'approval'" class="q-mr-md" />
                <q-btn v-if="showCancelBtn" color="negative" :label="t('task.cancel', '작업 취소')" @click="showCancelDialog" class="q-mr-md" />
              </template>
              <template v-else>
                <q-btn flat :label="t('common.cancel', 'Cancel')" color="grey-7" @click="handleCancel" class="q-mr-md" />
                <q-btn v-if="dialogMode === 'edit'" flat :label="t('common.save', 'Save')" color="primary" type="submit" :loading="isSubmitting" />
                <q-btn v-else-if="dialogMode === 'add'" flat :label="t('common.submit', 'Submit')" color="primary" type="submit" :loading="isSubmitting" />
              </template>
            </div>
          </q-form>
        </q-card-section>

        <!-- Task Employees Grid (outside form) -->
        <q-card-section v-if="dialogMode === 'view' && task?.id">
          <div class="row justify-between items-center q-mb-md">
            <h6 class="q-my-none">{{ t('events.taskEmployees', 'Task Employees') }}</h6>
            <q-btn 
              color="primary" 
              :label="t('task.addEmployee', 'Add Employee')"
              size="sm"
              @click="showAddEmployeeDialog = true" 
              v-if="!isWorker"
            />
          </div>
          <TaskEmployeeGrid 
            :task-id="task.id"
            @employee-selected="handleEmployeeSelected"
          />
        </q-card-section>
      </template>

      <!-- APPROVAL MODE -->
      <template v-else-if="dialogMode === 'approval'">
        <q-card-section>
          <div v-if="!requests || requests.length === 0" class="text-center q-pa-md">
            No pending requests
          </div>
          <div v-else>
            <q-list separator>
              <q-item v-for="request in requests" :key="request.id">
                <q-item-section>
                  <q-item-label>{{ request.workerName }}</q-item-label>
                  <q-item-label caption>Request Date: {{ formatDateTime(request.requestDate) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn color="positive" label="Approve" size="sm" @click="approveRequest(request)" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Back" @click="dialogMode = 'view'" />
        </q-card-actions>
      </template>

      <!-- JOIN REQUEST MODE -->
      <template v-else-if="dialogMode === 'join'">
        <q-card-section>
          <p>다음 작업에 참여 신청을 하시겠습니까?</p>
          <p class="text-weight-bold">{{ task?.title }}</p>
          <p>{{ formatDateRange(task?.startDateTime, task?.endDateTime) }} {{ formatTimeRange(task?.startDateTime, task?.endDateTime) }}</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" @click="dialogMode = 'view'" />
          <q-btn color="primary" label="신청하기" @click="submitJoinRequest" :loading="isSubmitting" />
        </q-card-actions>
      </template>

      <!-- CANCEL TASK MODE -->
      <template v-else-if="dialogMode === 'cancel'">
        <q-card-section>
          <p>다음 작업을 취소하시겠습니까?</p>
          <p class="text-weight-bold">{{ task?.title }}</p>
          <p>{{ formatDateRange(task?.startDateTime, task?.endDateTime) }} {{ formatTimeRange(task?.startDateTime, task?.endDateTime) }}</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" @click="dialogMode = 'view'" />
          <q-btn color="negative" label="취소하기" @click="submitCancelTask" :loading="isSubmitting" />
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar, date } from 'quasar';
import { useUserStore } from '@/stores/modules/store_user';
import { Task, Shop, TaskStatus, JoinRequest, getTaskStatusLabel, getTaskStatusColor } from '@/types';
import TaskEmployeeGrid from '../grid/TaskEmployeeGrid.vue'
import 'leaflet/dist/leaflet.css'
import L, { Map as LMap, Marker, TileLayer } from 'leaflet'

type DialogMode = 'view' | 'edit' | 'add' | 'approval' | 'join' | 'cancel';

const props = defineProps<{
  modelValue: boolean;
  task: Task | null;
  shops?: Shop[];
  requests?: JoinRequest[];
  isSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', task: Task): void;
  (e: 'add', task: Task): void;
  (e: 'join-request', task: Task): void;
  (e: 'cancel', task: Task): void;
  (e: 'approve', request: JoinRequest): void;
}>();

const $q = useQuasar();
const { t } = useI18n();
const userStore = useUserStore();

const dialogMode = ref<DialogMode>('view');
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});
const isSubmitting = computed(() => props.isSubmitting || false);

// Transition effects based on dialog mode
const transitionShow = computed(() => dialogMode.value === 'view' ? 'slide-up' : 'fade');
const transitionHide = computed(() => dialogMode.value === 'view' ? 'slide-down' : 'fade');

// Task form for edit mode
const form = ref<Task>({
  title: '',
  description: '',
  workerCount: 1,
  startDateTime: '',
  endDateTime: '',
  status: TaskStatus.SCHEDULED,
  teamId: null,
  shopId: null,
  active: true
});

// For Add Task Dialog
const addForm = ref<Task>({
  title: '',
  description: '',
  workerCount: 1,
  startDateTime: '',
  endDateTime: '',
status: TaskStatus.SCHEDULED,
  teamId: userStore.user?.teamId || 0,
  shopId: null,
  active: true,
  taskEmployees: null
});

// Split date and time for easier input in add mode
const startDate = ref(new Date().toISOString().split('T')[0]);
const startTime = ref('08:00');
const endDate = ref(new Date().toISOString().split('T')[0]);
const endTime = ref('17:00');

// Shop selection for add mode
const selectedShop = ref(null);

// Combine date and time into ISO strings for add mode
const updateStartDateTime = () => {
  addForm.value.startDateTime = `${startDate.value}T${startTime.value}:00`;
};

const updateEndDateTime = () => {
  addForm.value.endDateTime = `${endDate.value}T${endTime.value}:00`;
};

// TaskStatus options for the dropdown
const statusOptions = [
  { label: getTaskStatusLabel(TaskStatus.SCHEDULED), value: TaskStatus.SCHEDULED },
  { label: getTaskStatusLabel(TaskStatus.IN_PROGRESS), value: TaskStatus.IN_PROGRESS },
  { label: getTaskStatusLabel(TaskStatus.COMPLETED), value: TaskStatus.COMPLETED },
  { label: getTaskStatusLabel(TaskStatus.CANCELLED), value: TaskStatus.CANCELLED }
];

// Shop options
const shopOptions = computed(() => {
  if (!props.shops || props.shops.length === 0) return [];
  
  return props.shops.map(shop => ({
    label: shop.name,
    value: shop.id
  }));
});

// Permissions for task actions
const canRequestToJoin = computed(() => {
  if (!props.task) return false;
  
  // Check if task is active and user is logged in
  return (
    (props.task.status === TaskStatus.SCHEDULED || 
     props.task.status === TaskStatus.IN_PROGRESS) && 
    !!userStore.user?.accountId &&
    (props.task.taskEmployees?.length || 0) < props.task.workerCount
  );
});

const canManageTask = computed(() => {
  if (!props.task) return false;
  
  // Allow editing by team managers
  return userStore.isManager;
});

const canCancelTask = computed(() => {
  if (!props.task) return false;
  
  // Only allow cancellation by team managers for scheduled tasks
  return (
    props.task.status === TaskStatus.SCHEDULED && 
    userStore.isManager
  );
});

const hasApprovalRequests = computed(() => {
  return props.requests && props.requests.length > 0;
});

// Requests accessor
const requests = computed(() => props.requests || []);

// Helper function to format date range
function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return '-';
  
  const startDate = date.formatDate(start, 'YYYY.MM.DD');
  const endDate = date.formatDate(end, 'YYYY.MM.DD');
  
  if (startDate === endDate) {
    return startDate;
  }
  return `${startDate} - ${endDate}`;
}

// Helper function to format time range
function formatTimeRange(start?: string, end?: string): string {
  if (!start || !end) return '-';
  
  const startTime = date.formatDate(start, 'HH:mm');
  const endTime = date.formatDate(end, 'HH:mm');
  
  return `${startTime} - ${endTime}`;
}

// Helper function to format date time
function formatDateTime(dateTimeString?: string): string {
  if (!dateTimeString) return 'N/A';
  const date = new Date(dateTimeString);
  return date.toLocaleString();
}

// Watch for task changes to update the form
watch(() => props.task, (newTask) => {
  if (newTask) {
    form.value = { ...newTask };
    
    // Adjust datetime format for HTML datetime-local input
    if (form.value.startDateTime) {
      form.value.startDateTime = form.value.startDateTime.slice(0, 16);
    }
    if (form.value.endDateTime) {
      form.value.endDateTime = form.value.endDateTime.slice(0, 16);
    }
  }
}, { immediate: true });

// Reset edit mode when dialog closes
watch(() => isOpen.value, (newValue) => {
  if (!newValue) {
    dialogMode.value = 'view';
  }
});

// Watch selected shop and update shopId for add mode
watch(() => selectedShop.value, (newValue) => {
  if (newValue) {
    addForm.value.shopId = newValue.id;
  } else {
    addForm.value.shopId = null;
  }
});

// Form submission for edit mode
const onEditSubmit = () => {
  try {
    emit('submit', form.value);
    dialogMode.value = 'view';
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('task.updateError', 'Failed to update task')
    });
  }
};

// Form submission for add mode
const onAddSubmit = () => {
  try {
    // Ensure dates are up to date
    updateStartDateTime();
    updateEndDateTime();
    
    emit('add', addForm.value);
    // Reset will happen when dialog closes
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('task.addError', 'Failed to add task')
    });
  }
};

// Reset form for add mode
const handleReset = () => {
  // Reset date/time values
  startDate.value = new Date().toISOString().split('T')[0];
  startTime.value = '08:00';
  endDate.value = new Date().toISOString().split('T')[0];
  endTime.value = '17:00';
  
  // Reset shop selection
  selectedShop.value = null;
  
  // Reset task data
  addForm.value = {    
    title: '',
    description: '',
    workerCount: 1,
    startDateTime: `${startDate.value}T${startTime.value}:00`,
    endDateTime: `${endDate.value}T${endTime.value}:00`,
    status: TaskStatus.SCHEDULED,
    teamId: userStore.user?.teamId || 0,
    shopId: null,
    active: true,
    taskEmployees: null
  };
};

// Show join request dialog
const showJoinRequestDialog = () => {
  dialogMode.value = 'join';
};

// Show cancel dialog
const showCancelDialog = () => {
  dialogMode.value = 'cancel';
};

// Submit join request
const submitJoinRequest = () => {
  if (props.task) {
    emit('join-request', props.task);
    dialogMode.value = 'view';
  }
};

// Submit cancel task
const submitCancelTask = () => {
  if (props.task) {
    emit('cancel', props.task);
    dialogMode.value = 'view';
  }
};

// Approve request
const approveRequest = (request: JoinRequest) => {
  emit('approve', request);
};

// Button visibility computed properties
const showJoinBtn = computed(() => dialogMode.value === 'view' && canRequestToJoin.value)
const showEditBtn = computed(() => dialogMode.value === 'view' && canManageTask.value)
const showApprovalBtn = computed(() => dialogMode.value === 'view' && canManageTask.value && hasApprovalRequests.value)
const showCancelBtn = computed(() => dialogMode.value === 'view' && canCancelTask.value)

// View items for display
const viewItems = computed(() => [
  { label: t('task.status', '상태'), value: '', type: 'chip' },
  { label: t('task.shop', '매장'), value: props.task?.shopName || 'N/A' },
  { label: t('task.team', '팀'), value: props.task?.teamName || 'N/A' },
  { label: t('task.date', '일자'), value: formatDateRange(props.task?.startDateTime, props.task?.endDateTime) },
  { label: t('task.time', '시간'), value: formatTimeRange(props.task?.startDateTime, props.task?.endDateTime) },
  { label: t('task.workerCount', '필요 인원'), value: `${props.task?.workerCount} ${t('task.people', '명')}` },
  { label: t('task.currentWorkers', '현재 인원'), value: `${props.task?.taskEmployees?.length || 0} ${t('task.people', '명')}` }
])

// Override dialogMode to 'add' when no task is provided
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && !props.task?.id) {
    dialogMode.value = 'add';
  }
}, { immediate: true });

const showAddEmployeeDialog = ref(false)
const isWorker = false // Replace with actual logic if needed
function handleEmployeeSelected(employee: any) {
  // Implement employee selection logic or emit event
}

const currentForm = computed<Task>({
  get() {
    if (dialogMode.value === 'add') return addForm.value
    return form.value
  },
  set(val: Task) {
    if (dialogMode.value === 'add') addForm.value = val
    else form.value = val
  }
})

function handleFormSubmit() {
  if (dialogMode.value === 'add') {
    updateStartDateTime();
    updateEndDateTime();
    emit('add', addForm.value);
  } else if (dialogMode.value === 'edit') {
    emit('submit', form.value);
    dialogMode.value = 'view';
  }
}

function handleCancel() {
  if (dialogMode.value === 'edit') dialogMode.value = 'view'
  else isOpen.value = false
}

// Update ref types
const map = ref<any>(null)
const marker = ref<any>(null)

// Update watch effect to handle missing coordinates
watch(() => currentForm.value.shopId, async (newShopId) => {
  if (!newShopId) {
    if (map.value) {
      map.value.remove()
      map.value = null
      marker.value = null
    }
    return
  }
  
  const shop = props.shops?.find(s => s.id === newShopId)
  if (!shop) return

  const lat = shop.latitude ?? 37.5665 // Default to Seoul if no coordinates
  const lng = shop.longitude ?? 126.9780

  await nextTick()
  if (!map.value) {
    map.value = L.map('map').setView([lat, lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.value)
  } else {
    map.value.setView([lat, lng], 15)
  }
  
  if (marker.value) {
    marker.value.setLatLng([lat, lng])
  } else {
    marker.value = L.marker([lat, lng]).addTo(map.value)
  }

  // Add popup with shop info
  marker.value.bindPopup(`
    <b>${shop.name}</b><br>
    ${shop.region || ''}
  `).openPopup()
})

// Add cleanup
onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
    marker.value = null
  }
})
</script>

<style scoped>
.task-details-dialog {
  width: 100%;
  max-width: 1000px;
  height: 100%;
  max-height: 90vh;
  border-radius: 8px;
}

.dialog-card {
  width: 800px;
  max-width: 90vw;
}

.approval-dialog {
  width: 500px;
  max-width: 90vw;
}

@media (min-width: 768px) {
  .task-details-dialog {
    max-height: 80vh;
    height: auto;
  }
}
</style> 