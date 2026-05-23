<template>
  <q-page padding class="module-page">
    <PageHeader
      title="Dashboard"
      subtitle="항공 토픽 및 스케줄 현황"
      icon="dashboard"
      :breadcrumb="[{ label: 'Aviation' }, { label: 'Dashboard' }]"
    />

    <div class="row q-col-gutter-md">
      <!-- Stat cards -->
      <div class="col-12 col-sm-6">
        <div class="stat-card stat-card--primary">
          <div class="stat-card__icon">
            <q-icon name="topic" size="22px" />
          </div>
          <div class="stat-card__body">
            <div class="stat-card__label">총 토픽 수</div>
            <div class="stat-card__value">{{ stats?.totalTopics ?? '—' }}</div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-6">
        <div class="stat-card stat-card--success">
          <div class="stat-card__icon">
            <q-icon name="check_circle" size="22px" />
          </div>
          <div class="stat-card__body">
            <div class="stat-card__label">활성 토픽</div>
            <div class="stat-card__value">{{ stats?.activeTopics ?? '—' }}</div>
          </div>
        </div>
      </div>

      <!-- Weekly schedule -->
      <div class="col-12">
        <div class="content-card">
          <div class="content-card__header">
            <q-icon name="calendar_today" size="18px" class="q-mr-sm" />
            주간 스케줄
          </div>
          <q-list separator>
            <q-item v-for="day in weeklySchedule" :key="day.day_of_month ?? day.dayOfWeek" class="schedule-item">
              <q-item-section avatar>
                <div class="day-badge">{{ dayNames[day.day_of_month ?? day.dayOfWeek]?.slice(0, 1) }}</div>
              </q-item-section>
              <q-item-section>
                <q-item-label class="schedule-day">{{ dayNames[day.day_of_month ?? day.dayOfWeek] }}</q-item-label>
                <q-item-label caption class="schedule-name">{{ day.name }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="!weeklySchedule.length" class="schedule-empty">
              <q-item-section class="text-center">
                <span style="color: var(--voy-text-muted)">스케줄 없음</span>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { topicsApi } from '@/api/aviation/client';
import { useQuasar } from 'quasar';
import PageHeader from '@/components/common/PageHeader.vue';

const $q = useQuasar();
const stats = ref<any>(null);
const weeklySchedule = ref<any[]>([]);
const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

async function loadStats() {
  try {
    stats.value = await topicsApi.getStats();
  } catch (error: any) {
    $q.notify({ type: 'negative', message: '통계 로딩 실패: ' + error.message });
  }
}

async function loadSchedule() {
  try {
    weeklySchedule.value = await topicsApi.getSchedule();
  } catch (error: any) {
    $q.notify({ type: 'negative', message: '스케줄 로딩 실패: ' + error.message });
  }
}

onMounted(() => {
  loadStats();
  loadSchedule();
});
</script>

<style scoped lang="scss">
.module-page {
  background: var(--voy-bg, #f5f5f7);
  min-height: 100%;
}

// Stat cards
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--voy-surface, #fff);
  border-radius: var(--voy-radius-lg, 16px);
  border: 1px solid var(--voy-border, rgba(0,0,0,0.06));
  box-shadow: var(--voy-shadow-sm);
  transition: box-shadow var(--voy-transition-fast, 150ms), transform var(--voy-transition-fast, 150ms);

  &:hover {
    box-shadow: var(--voy-shadow-md);
    transform: translateY(-2px);
  }

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: var(--voy-radius-md, 12px);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__label {
    font-size: 13px;
    color: var(--voy-text-secondary, #6e6e73);
    margin-bottom: 4px;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    color: var(--voy-text, #1d1d1f);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  &--primary .stat-card__icon {
    background: rgba(0, 55, 235, 0.08);
    color: var(--voy-primary, #0037EB);
  }

  &--success .stat-card__icon {
    background: rgba(16, 185, 129, 0.08);
    color: var(--voy-success, #10b981);
  }
}

// Content card (general purpose)
.content-card {
  background: var(--voy-surface, #fff);
  border-radius: var(--voy-radius-lg, 16px);
  border: 1px solid var(--voy-border, rgba(0,0,0,0.06));
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    font-size: 15px;
    font-weight: 600;
    color: var(--voy-text, #1d1d1f);
    border-bottom: 1px solid var(--voy-border, rgba(0,0,0,0.06));
  }
}

.schedule-item {
  padding: 12px 20px;
}

.day-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--voy-primary-muted, rgba(0,55,235,0.08));
  color: var(--voy-primary, #0037EB);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.schedule-day { font-weight: 500; }
.schedule-name { color: var(--voy-text-secondary, #6e6e73); }
.schedule-empty { padding: 24px; }
</style>
