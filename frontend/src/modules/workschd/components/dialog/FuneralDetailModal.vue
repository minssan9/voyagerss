<template>
  <div class="dialog-overlay dialog-overlay--sheet" @click.self="$emit('close')">
    <div class="dialog-sheet dialog-sheet--bottom">
      <!-- Header -->
      <div class="dialog-title">
        <div class="header-info">
          <span class="region-tag" :class="funeral.region.toLowerCase()">
            {{ regionLabel(funeral.region) }}
          </span>
          <h2 class="funeral-home-name">{{ funeral.funeralHomeName }}</h2>
          <a :href="funeral.funeralHomeUrl" target="_blank" class="home-link">
            {{ t('funeral.detail.website') }}
          </a>
        </div>
        <q-btn icon="close" flat round dense @click="$emit('close')" />
      </div>

      <div class="dialog-content">

        <!-- Deceased Info Section -->
        <section class="info-section">
          <div class="deceased-block">
            <div class="deceased-label">{{ t('funeral.detail.deceasedLabel') }}</div>
            <div class="deceased-name">故 {{ funeral.deceasedName }}</div>
          </div>

          <div class="info-grid">
            <div v-if="funeral.roomNumber" class="info-item">
              <span class="info-label">{{ t('funeral.labels.room') }}</span>
              <span class="info-value">{{ funeral.roomNumber }}</span>
            </div>
            <div v-if="funeral.chiefMourner" class="info-item">
              <span class="info-label">{{ t('funeral.labels.chiefMourner') }}</span>
              <span class="info-value">{{ funeral.chiefMourner }}</span>
            </div>
            <div v-if="funeral.funeralDate" class="info-item">
              <span class="info-label">{{ t('funeral.detail.funeralDate') }}</span>
              <span class="info-value">{{ funeral.funeralDate }}</span>
            </div>
            <div v-if="funeral.burialDate" class="info-item">
              <span class="info-label">{{ t('funeral.detail.burialDate') }}</span>
              <span class="info-value">{{ funeral.burialDate }}</span>
            </div>
            <div v-if="funeral.burialPlace" class="info-item">
              <span class="info-label">{{ t('funeral.detail.burialPlace') }}</span>
              <span class="info-value">{{ funeral.burialPlace }}</span>
            </div>
            <div v-if="funeral.religion" class="info-item">
              <span class="info-label">{{ t('funeral.detail.religion') }}</span>
              <span class="info-value">{{ funeral.religion }}</span>
            </div>
          </div>
        </section>

        <div class="divider"></div>

        <!-- TEAM LEADER: Task Management Section -->
        <section v-if="isTeamLeader" class="management-section">
          <h3 class="section-title">{{ t('funeral.detail.workManagement') }}</h3>

          <div v-if="funeral.taskId" class="linked-task">
            <div class="linked-icon">✓</div>
            <div class="linked-text">
              <div class="linked-title">{{ t('funeral.detail.linkedTask', { id: funeral.taskId }) }}</div>
              <div class="linked-sub">{{ t('funeral.detail.linkedTaskSub') }}</div>
            </div>
            <button class="btn-secondary" @click="openAdminModal">{{ t('funeral.detail.manage') }}</button>
          </div>

          <div v-else class="create-task-block">
            <p class="create-description">
              {{ t('funeral.detail.createDescription') }}
            </p>

            <div class="form-group">
              <label class="form-label">{{ t('funeral.detail.workerCount') }}</label>
              <div class="number-input">
                <button class="num-btn" @click="workerCount = Math.max(1, workerCount - 1)">−</button>
                <span class="num-value">{{ workerCount }}</span>
                <button class="num-btn" @click="workerCount++">+</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('funeral.detail.taskTitle') }}</label>
              <input
                v-model="taskTitle"
                type="text"
                class="form-input"
                :placeholder="defaultTaskTitle"
              />
            </div>

            <button
              class="btn-primary"
              :disabled="creatingTask"
              @click="createTask"
            >
              {{ creatingTask ? t('funeral.detail.registering') : t('funeral.detail.registerTask') }}
            </button>
          </div>
        </section>

        <!-- WORKER: Apply Section -->
        <section v-else class="apply-section">
          <h3 class="section-title">{{ t('funeral.detail.workApply') }}</h3>

          <div v-if="!funeral.taskId" class="no-task-notice">
            {{ t('funeral.detail.noTaskYet') }}
          </div>

          <div v-else>
            <div v-if="myApplication" class="application-status">
              <div class="status-indicator" :class="myApplication.status.toLowerCase()"></div>
              <div class="status-text">
                <div class="status-title">{{ statusLabel(myApplication.status) }}</div>
                <div class="status-sub">{{ t('funeral.detail.appliedAt', { date: formatDate(myApplication.appliedAt) }) }}</div>
              </div>
              <button
                v-if="myApplication.status === 'PENDING'"
                class="btn-cancel"
                @click="cancelApplication"
              >
                {{ t('common.cancel') }}
              </button>
            </div>

            <button
              v-else
              class="btn-primary full-width"
              :disabled="applying"
              @click="applyForWork"
            >
              {{ applying ? t('funeral.detail.applying') : t('funeral.detail.applyWork') }}
            </button>
          </div>
        </section>

      </div>
    </div>

    <!-- Admin Modal (nested) -->
    <AdminFuneralModal
      v-if="showAdminModal && funeral.taskId"
      :task-id="funeral.taskId"
      @close="showAdminModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/common/store_user';
import { ScrapedFuneral } from '@/modules/workschd/api/api-scraper';
import scraperApi from '@/modules/workschd/api/api-scraper';
import taskApi from '@/modules/workschd/api/api-task';
import AdminFuneralModal from './AdminFuneralModal.vue';

interface Props {
  funeral: ScrapedFuneral;
  isTeamLeader: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  'task-created': [taskId: number];
}>();

const { t } = useI18n();
const userStore = useUserStore();
const showAdminModal = ref(false);
const workerCount = ref(3);
const defaultTaskTitle = computed(() =>
  t('funeral.detail.taskTitlePlaceholder', { name: props.funeral.deceasedName })
);
const taskTitle = ref('');
const creatingTask = ref(false);
const applying = ref(false);
const myApplication = ref<any | null>(null);

onMounted(async () => {
  taskTitle.value = defaultTaskTitle.value;

  if (!props.isTeamLeader && props.funeral.taskId && userStore.accountId) {
    try {
      const res = await taskApi.getTaskEmployees(props.funeral.taskId);
      const apps = res.data;
      myApplication.value = apps.find((e: any) => e.accountId === userStore.accountId) || null;
    } catch {
      myApplication.value = null;
    }
  }
});

async function createTask() {
  if (creatingTask.value) return;
  creatingTask.value = true;
  try {
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const taskData = {
      title: taskTitle.value || defaultTaskTitle.value,
      description: t('funeral.detail.taskDescription', {
        funeralHome: props.funeral.funeralHomeName,
        room: props.funeral.roomNumber || '-',
        date: props.funeral.funeralDate || '-',
      }),
      workerCount: workerCount.value,
      startDateTime: now.toISOString(),
      endDateTime: end.toISOString(),
      status: 'OPEN',
      teamId: userStore.user.teamId || 0,
      shopId: null,
      active: true
    } as any;

    const res = await taskApi.createTask(taskData);
    const taskId = res.data.id!;

    // Link scraped funeral to the new task
    await scraperApi.linkFuneralToTask(props.funeral.id, taskId);

    emit('task-created', taskId);
  } catch (e) {
    console.error('Create task failed:', e);
  } finally {
    creatingTask.value = false;
  }
}

async function applyForWork() {
  if (applying.value || !props.funeral.taskId) return;
  applying.value = true;
  try {
    await taskApi.createTaskEmployeeRequest({
      taskId: props.funeral.taskId,
      accountId: userStore.accountId
    });
    // Reload application status
    const res = await taskApi.getTaskEmployees(props.funeral.taskId);
    myApplication.value = res.data.find((e: any) => e.accountId === userStore.accountId) || null;
  } catch (e) {
    console.error('Apply failed:', e);
  } finally {
    applying.value = false;
  }
}

async function cancelApplication() {
  if (!myApplication.value?.id) return;
  try {
    // DELETE /task/request/:requestId
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/workschd/task/request/${myApplication.value.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userStore.accessToken}` }
    });
    myApplication.value = null;
  } catch (e) {
    console.error('Cancel failed:', e);
  }
}

function openAdminModal() {
  showAdminModal.value = true;
}

function regionLabel(region: string): string {
  if (region === 'INCHEON') return t('funeral.region.incheon');
  if (region === 'BUCHEON') return t('funeral.region.bucheon');
  return region;
}

function statusLabel(status: string): string {
  return t('funeral.applicationStatus.' + status);
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}
</script>
