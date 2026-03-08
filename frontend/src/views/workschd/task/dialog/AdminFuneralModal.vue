<template>
  <div class="admin-modal-overlay" @click.self="$emit('close')">
    <div class="admin-modal">
      <!-- Header -->
      <div class="modal-header">
        <h3 class="modal-title">근무자 관리</h3>
        <div class="modal-subtitle">태스크 #{{ taskId }}</div>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <!-- Task Info -->
      <div v-if="task" class="task-summary">
        <div class="summary-item">
          <span class="summary-label">상태</span>
          <span class="status-badge" :class="task.status.toLowerCase()">{{ statusLabel(task.status) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">인원</span>
          <span class="summary-value">{{ task.currentWorkerCount ?? 0 }} / {{ task.workerCount }}명</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">제목</span>
          <span class="summary-value">{{ task.title }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-row">
        <div class="mini-spinner"></div>
        <span>불러오는 중...</span>
      </div>

      <!-- Applicants List -->
      <div v-else-if="employees.length > 0" class="employees-list">
        <div class="list-header">
          <span>신청자 ({{ employees.length }}명)</span>
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
            <div class="emp-name">{{ emp.account?.username || `사용자 #${emp.accountId}` }}</div>
            <div class="emp-meta">
              <span v-if="emp.account?.email" class="emp-email">{{ emp.account.email }}</span>
              <span class="emp-date">{{ formatDate(emp.appliedAt) }} 신청</span>
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
              승인
            </button>
            <button
              v-if="emp.status === 'PENDING'"
              class="action-btn reject"
              :disabled="rejecting === emp.id"
              @click="reject(emp)"
            >
              거절
            </button>
            <span v-if="emp.status === 'APPROVED'" class="approved-check">✓ 확정</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-employees">
        신청자가 없습니다.
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn-outline" @click="$emit('close')">닫기</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import taskApi from '@/api/workschd/api-task';

interface Props {
  taskId: number;
}

const props = defineProps<Props>();
defineEmits<{ close: [] }>();

const task = ref<any | null>(null);
const employees = ref<any[]>([]);
const loading = ref(false);
const approving = ref<number | null>(null);
const rejecting = ref<number | null>(null);
const activeFilter = ref('ALL');

const statusFilters = [
  { label: '전체', value: 'ALL' },
  { label: '대기', value: 'PENDING' },
  { label: '승인', value: 'APPROVED' },
  { label: '거절', value: 'REJECTED' }
];

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
      `${import.meta.env.VITE_API_URL}/workschd/task/request/${emp.id}/reject`,
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
  const map: Record<string, string> = {
    PENDING: '대기', APPROVED: '승인', REJECTED: '거절',
    CANCELLED: '취소', OPEN: '모집중', CLOSED: '마감', COMPLETED: '완료'
  };
  return map[status] || status;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

function getToken(): string {
  try {
    const { useUserStore } = require('@/stores/common/store_user');
    return useUserStore().accessToken || '';
  } catch { return ''; }
}
</script>

<style scoped>
.admin-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(4px);
}

.admin-modal {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 540px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

/* ── Header ── */
.modal-header {
  display: flex;
  align-items: flex-start;
  padding: 24px 24px 0;
  gap: 12px;
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0;
  flex: 1;
}

.modal-subtitle {
  font-size: 12px;
  color: #aeaeb2;
  margin-top: 3px;
}

.close-btn {
  background: #f2f2f7;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 16px;
  cursor: pointer;
  color: #6e6e73;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Task Summary ── */
.task-summary {
  display: flex;
  gap: 20px;
  padding: 16px 24px;
  border-bottom: 1px solid #f2f2f7;
  flex-wrap: wrap;
}

.summary-item { display: flex; flex-direction: column; gap: 4px; }
.summary-label { font-size: 11px; color: #aeaeb2; }
.summary-value { font-size: 14px; color: #1d1d1f; font-weight: 500; }

.status-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  padding: 3px 8px;
}

.status-badge.open { background: #e8f5e9; color: #2e7d32; }
.status-badge.closed { background: #fce4ec; color: #c62828; }
.status-badge.completed { background: #e3f2fd; color: #1565c0; }

/* ── Employees List ── */
.employees-list { padding: 0 24px; flex: 1; }

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6e6e73;
}

.filter-tabs { display: flex; gap: 4px; }

.tab {
  background: none;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #6e6e73;
  transition: all 0.15s;
}

.tab.active { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }

.employee-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f7;
}

.emp-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  color: #6e6e73;
  flex-shrink: 0;
}

.emp-info { flex: 1; min-width: 0; }
.emp-name { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.emp-meta { display: flex; gap: 8px; margin-top: 2px; }
.emp-email { font-size: 12px; color: #6e6e73; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
.emp-date { font-size: 12px; color: #aeaeb2; }

.emp-status {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.pending { background: #ffd60a; }
.status-dot.approved { background: #34c759; }
.status-dot.rejected { background: #ff3b30; }
.status-dot.cancelled { background: #aeaeb2; }

.status-text-sm { font-size: 12px; color: #6e6e73; }

.emp-actions { display: flex; gap: 6px; flex-shrink: 0; }

.action-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.action-btn:disabled { opacity: 0.4; cursor: default; }
.action-btn.approve { background: #e8f5e9; color: #2e7d32; }
.action-btn.approve:hover:not(:disabled) { background: #c8e6c9; }
.action-btn.reject { background: #fce4ec; color: #c62828; }
.action-btn.reject:hover:not(:disabled) { background: #f8bbd0; }

.approved-check { font-size: 12px; color: #34c759; font-weight: 600; }

/* ── States ── */
.loading-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  color: #6e6e73;
  font-size: 14px;
}

.mini-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #d2d2d7;
  border-top-color: #1d1d1f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-employees {
  padding: 32px 24px;
  text-align: center;
  font-size: 14px;
  color: #aeaeb2;
}

/* ── Footer ── */
.modal-footer {
  padding: 16px 24px 24px;
  border-top: 1px solid #f2f2f7;
  display: flex;
  justify-content: flex-end;
}

.btn-outline {
  background: #fff;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #1d1d1f;
}
</style>
