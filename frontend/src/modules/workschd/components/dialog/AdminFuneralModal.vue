<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-card medium">
      <div class="dialog-title">
        <div>
          <div class="text-h6">{{ t('funeral.admin.title') }}</div>
          <div class="text-caption text-grey-7">{{ t('funeral.admin.taskSubtitle', { id: taskId }) }}</div>
        </div>
        <q-btn icon="close" flat round dense @click="$emit('close')" />
      </div>

      <div class="dialog-content">
      <!-- Task Info -->
      <div v-if="task" class="funeral-admin-summary">
        <div class="summary-item">
          <span class="summary-label">{{ t('funeral.admin.status') }}</span>
          <span class="status-badge" :class="task.status.toLowerCase()">{{ statusLabel(task.status) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('funeral.admin.workers') }}</span>
          <span class="summary-value">{{ t('funeral.admin.workersCount', { current: task.currentWorkerCount ?? 0, total: task.workerCount }) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('funeral.admin.titleLabel') }}</span>
          <span class="summary-value">{{ task.title }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-row">
        <div class="mini-spinner"></div>
        <span>{{ t('funeral.loading') }}</span>
      </div>

      <!-- Applicants List -->
      <div v-else-if="employees.length > 0" class="funeral-admin-employees">
        <div class="list-header">
          <span>{{ t('funeral.admin.applicants', { count: employees.length }) }}</span>
          <div class="filter-tabs">
            <button
              v-for="s in statusFilters"
              :key="s.value"
              class="tab"
              :class="{ active: activeFilter === s.value }"
              @click="activeFilter = s.value"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <div
          v-for="emp in filteredEmployees"
          :key="emp.id"
          class="employee-row"
        >
          <div class="emp-avatar">{{ empInitial(emp) }}</div>
          <div class="emp-info">
            <div class="emp-name">{{ emp.account?.username || t('funeral.admin.userFallback', { id: emp.accountId }) }}</div>
            <div class="emp-meta">
              <span v-if="emp.account?.email" class="emp-email">{{ emp.account.email }}</span>
              <span class="emp-date">{{ t('funeral.admin.appliedAt', { date: formatDate(emp.appliedAt) }) }}</span>
            </div>
          </div>
          <div class="emp-status">
            <span class="status-dot" :class="emp.status.toLowerCase()"></span>
            <span class="status-text-sm">{{ statusLabel(emp.status) }}</span>
          </div>
          <div class="emp-actions">
            <button
              v-if="emp.status === 'PENDING'"
              class="action-btn approve"
              :disabled="approving === emp.id"
              @click="approve(emp)"
            >
              {{ t('funeral.admin.approve') }}
            </button>
            <button
              v-if="emp.status === 'PENDING'"
              class="action-btn reject"
              :disabled="rejecting === emp.id"
              @click="reject(emp)"
            >
              {{ t('funeral.admin.reject') }}
            </button>
            <span v-if="emp.status === 'APPROVED'" class="approved-check">{{ t('funeral.admin.confirmed') }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-employees">
        {{ t('funeral.admin.noApplicants') }}
      </div>

      </div>

      <div class="dialog-actions">
        <q-btn flat no-caps :label="t('common.close')" @click="$emit('close')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import taskApi from '@/modules/workschd/api/api-task';
import { useUserStore } from '@/stores/common/store_user';

interface Props {
  taskId: number;
}

const props = defineProps<Props>();
defineEmits<{ close: [] }>();

const { t } = useI18n();
const userStore = useUserStore();
const task = ref<any | null>(null);
const employees = ref<any[]>([]);
const loading = ref(false);
const approving = ref<number | null>(null);
const rejecting = ref<number | null>(null);
const activeFilter = ref('ALL');

const statusFilters = computed(() => [
  { label: t('funeral.admin.filter.all'), value: 'ALL' },
  { label: t('funeral.admin.filter.pending'), value: 'PENDING' },
  { label: t('funeral.admin.filter.approved'), value: 'APPROVED' },
  { label: t('funeral.admin.filter.rejected'), value: 'REJECTED' },
]);

const filteredEmployees = computed(() => {
  if (activeFilter.value === 'ALL') return employees.value;
  return employees.value.filter(e => e.status === activeFilter.value);
});

onMounted(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [taskRes, empRes] = await Promise.all([
      taskApi.fetchTasks(),   // fallback; ideally taskApi.getTaskById(props.taskId)
      taskApi.getTaskEmployees(props.taskId)
    ]);
    employees.value = empRes.data;
  } catch (e) {
    console.error('Failed to load task data:', e);
  } finally {
    loading.value = false;
  }
}

async function approve(emp: any) {
  if (approving.value === emp.id) return;
  approving.value = emp.id;
  try {
    await taskApi.approveJoinRequest({ id: emp.id, taskId: props.taskId });
    emp.status = 'APPROVED';
  } catch (e) {
    console.error('Approve failed:', e);
  } finally {
    approving.value = null;
  }
}

async function reject(emp: any) {
  if (rejecting.value === emp.id) return;
  rejecting.value = emp.id;
  try {
    await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/workschd/task/request/${emp.id}/reject`,
      { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } }
    );
    emp.status = 'REJECTED';
  } catch (e) {
    console.error('Reject failed:', e);
  } finally {
    rejecting.value = null;
  }
}

function empInitial(emp: any): string {
  const name = emp.account?.username || '';
  return name.charAt(0) || '?';
}

function statusLabel(status: string): string {
  return t('funeral.taskStatus.' + status);
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

function getToken(): string {
  return userStore.accessToken || '';
}
</script>
