<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-sheet">
      <!-- Handle -->
      <div class="sheet-handle"></div>

      <!-- Header -->
      <div class="sheet-header">
        <div class="header-info">
          <span class="region-tag" :class="funeral.region.toLowerCase()">
            {{ funeral.region === 'INCHEON' ? '인천' : '부천' }}
          </span>
          <h2 class="funeral-home-name">{{ funeral.funeralHomeName }}</h2>
          <a :href="funeral.funeralHomeUrl" target="_blank" class="home-link">
            웹사이트 ↗
          </a>
        </div>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <!-- Content -->
      <div class="sheet-content">

        <!-- Deceased Info Section -->
        <section class="info-section">
          <div class="deceased-block">
            <div class="deceased-label">고 인</div>
            <div class="deceased-name">故 {{ funeral.deceasedName }}</div>
          </div>

          <div class="info-grid">
            <div v-if="funeral.roomNumber" class="info-item">
              <span class="info-label">빈소</span>
              <span class="info-value">{{ funeral.roomNumber }}</span>
            </div>
            <div v-if="funeral.chiefMourner" class="info-item">
              <span class="info-label">상주</span>
              <span class="info-value">{{ funeral.chiefMourner }}</span>
            </div>
            <div v-if="funeral.funeralDate" class="info-item">
              <span class="info-label">발인일</span>
              <span class="info-value">{{ funeral.funeralDate }}</span>
            </div>
            <div v-if="funeral.burialDate" class="info-item">
              <span class="info-label">장례일</span>
              <span class="info-value">{{ funeral.burialDate }}</span>
            </div>
            <div v-if="funeral.burialPlace" class="info-item">
              <span class="info-label">장지</span>
              <span class="info-value">{{ funeral.burialPlace }}</span>
            </div>
            <div v-if="funeral.religion" class="info-item">
              <span class="info-label">종교</span>
              <span class="info-value">{{ funeral.religion }}</span>
            </div>
          </div>
        </section>

        <div class="divider"></div>

        <!-- TEAM LEADER: Task Management Section -->
        <section v-if="isTeamLeader" class="management-section">
          <h3 class="section-title">근무 관리</h3>

          <div v-if="funeral.taskId" class="linked-task">
            <div class="linked-icon">✓</div>
            <div class="linked-text">
              <div class="linked-title">배정된 태스크 #{{ funeral.taskId }}</div>
              <div class="linked-sub">이 빈소에 태스크가 연결되어 있습니다.</div>
            </div>
            <button class="btn-secondary" @click="openAdminModal">관리</button>
          </div>

          <div v-else class="create-task-block">
            <p class="create-description">
              이 빈소를 근무 태스크로 등록하여 상조 도우미를 배정할 수 있습니다.
            </p>

            <div class="form-group">
              <label class="form-label">필요 인원</label>
              <div class="number-input">
                <button class="num-btn" @click="workerCount = Math.max(1, workerCount - 1)">−</button>
                <span class="num-value">{{ workerCount }}</span>
                <button class="num-btn" @click="workerCount++">+</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">태스크 제목</label>
              <input
                v-model="taskTitle"
                type="text"
                class="form-input"
                :placeholder="`故 ${funeral.deceasedName} 빈소 근무`"
              />
            </div>

            <button
              class="btn-primary"
              :disabled="creatingTask"
              @click="createTask"
            >
              {{ creatingTask ? '등록 중...' : '태스크 등록' }}
            </button>
          </div>
        </section>

        <!-- WORKER: Apply Section -->
        <section v-else class="apply-section">
          <h3 class="section-title">근무 신청</h3>

          <div v-if="!funeral.taskId" class="no-task-notice">
            아직 근무 태스크가 등록되지 않았습니다.
          </div>

          <div v-else>
            <div v-if="myApplication" class="application-status">
              <div class="status-indicator" :class="myApplication.status.toLowerCase()"></div>
              <div class="status-text">
                <div class="status-title">{{ statusLabel(myApplication.status) }}</div>
                <div class="status-sub">{{ formatDate(myApplication.appliedAt) }} 신청</div>
              </div>
              <button
                v-if="myApplication.status === 'PENDING'"
                class="btn-cancel"
                @click="cancelApplication"
              >
                취소
              </button>
            </div>

            <button
              v-else
              class="btn-primary full-width"
              :disabled="applying"
              @click="applyForWork"
            >
              {{ applying ? '신청 중...' : '근무 신청하기' }}
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
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/common/store_user';
import { ScrapedFuneral } from '@/api/workschd/api-scraper';
import scraperApi from '@/api/workschd/api-scraper';
import taskApi from '@/api/workschd/api-task';
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

const userStore = useUserStore();
const showAdminModal = ref(false);
const workerCount = ref(3);
const taskTitle = ref(`故 ${props.funeral.deceasedName} 빈소 근무`);
const creatingTask = ref(false);
const applying = ref(false);
const myApplication = ref<any | null>(null);

onMounted(async () => {
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
      title: taskTitle.value || `故 ${props.funeral.deceasedName} 빈소 근무`,
      description: `장례식장: ${props.funeral.funeralHomeName}\n빈소: ${props.funeral.roomNumber || '-'}\n발인일: ${props.funeral.funeralDate || '-'}`,
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
    await fetch(`${import.meta.env.VITE_API_URL}/workschd/task/request/${myApplication.value.id}`, {
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

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '승인 대기 중',
    APPROVED: '승인됨',
    REJECTED: '거절됨',
    CANCELLED: '취소됨'
  };
  return map[status] || status;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  backdrop-filter: blur(4px);
}

.modal-sheet {
  background: #fff;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom, 24px);
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #d2d2d7;
  border-radius: 2px;
  margin: 12px auto 0;
}

/* ── Header ── */
.sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px 16px;
}

.header-info { flex: 1; }

.region-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  padding: 3px 8px;
  margin-bottom: 6px;
}

.region-tag.incheon { background: #e8f0fe; color: #1a73e8; }
.region-tag.bucheon { background: #fce8e6; color: #d93025; }

.funeral-home-name {
  font-size: 18px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 4px;
}

.home-link {
  font-size: 12px;
  color: #0071e3;
  text-decoration: none;
}

.close-btn {
  background: #f2f2f7;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 18px;
  cursor: pointer;
  color: #6e6e73;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 12px;
}

/* ── Content ── */
.sheet-content { padding: 0 24px 32px; }

/* ── Deceased Info ── */
.info-section { padding-bottom: 20px; }

.deceased-block {
  margin-bottom: 20px;
}

.deceased-label {
  font-size: 11px;
  font-weight: 600;
  color: #aeaeb2;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.deceased-name {
  font-size: 26px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.5px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.info-item { display: flex; flex-direction: column; gap: 3px; }
.info-label { font-size: 11px; color: #aeaeb2; font-weight: 500; }
.info-value { font-size: 15px; color: #1d1d1f; font-weight: 500; }

.divider { height: 1px; background: #f2f2f7; margin: 4px 0 24px; }

/* ── Management Section (Leader) ── */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 16px;
}

.linked-task {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f0faf0;
  border: 1px solid #d4edda;
  border-radius: 12px;
  padding: 16px;
}

.linked-icon { font-size: 20px; color: #28a745; }
.linked-title { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.linked-sub { font-size: 12px; color: #6e6e73; margin-top: 2px; }
.linked-text { flex: 1; }

.create-description {
  font-size: 14px;
  color: #6e6e73;
  line-height: 1.5;
  margin: 0 0 20px;
}

.form-group { margin-bottom: 16px; }

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #3a3a3c;
  margin-bottom: 8px;
}

.number-input {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  overflow: hidden;
  width: fit-content;
}

.num-btn {
  background: #f5f5f7;
  border: none;
  width: 40px;
  height: 40px;
  font-size: 18px;
  cursor: pointer;
  color: #1d1d1f;
  transition: background 0.15s;
}

.num-btn:hover { background: #e8e8e8; }
.num-value { padding: 0 20px; font-size: 16px; font-weight: 600; color: #1d1d1f; }

.form-input {
  width: 100%;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.form-input:focus { border-color: #0071e3; }

/* ── Apply Section (Worker) ── */
.no-task-notice {
  background: #f5f5f7;
  border-radius: 12px;
  padding: 16px;
  font-size: 14px;
  color: #6e6e73;
  text-align: center;
}

.application-status {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f5f7;
  border-radius: 12px;
  padding: 16px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.pending { background: #ffd60a; }
.status-indicator.approved { background: #34c759; }
.status-indicator.rejected { background: #ff3b30; }
.status-indicator.cancelled { background: #aeaeb2; }

.status-title { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.status-sub { font-size: 12px; color: #6e6e73; margin-top: 2px; }
.status-text { flex: 1; }

/* ── Buttons ── */
.btn-primary {
  background: #1d1d1f;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 8px;
}

.btn-primary.full-width { width: 100%; }
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.4; cursor: default; }

.btn-secondary {
  background: #f5f5f7;
  color: #1d1d1f;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel {
  background: #fff0f0;
  color: #ff3b30;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
</style>
