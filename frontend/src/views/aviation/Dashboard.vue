<template>
  <q-page class="lp-page">
    <div class="lp-container">

      <!-- Hero -->
      <section class="lp-hero">
        <span class="lp-badge" style="background: rgba(48,184,138,0.08); color: #30b88a;">
          <q-icon name="flight" size="14px" />
          항공 지식 관리
        </span>
        <h1 class="lp-title">항공 퀴즈 &<br>날씨 관리</h1>
        <p class="lp-subtitle">
          일별 항공 지식 토픽 스케줄을 관리하고<br>기상청 이미지를 자동 수집·보관합니다
        </p>
        <div class="lp-actions">
          <q-btn class="lp-btn-primary" label="토픽 관리" no-caps unelevated @click="router.push('/aviation/topics')" />
          <q-btn class="lp-btn-secondary" label="날씨 현황" no-caps outline @click="router.push('/aviation/weather')" />
        </div>
      </section>

      <!-- Stats Strip -->
      <div class="lp-stats">
        <div class="lp-stat">
          <q-skeleton v-if="!stats" type="text" width="60px" class="q-mx-auto" />
          <template v-else>
            <div class="lp-stat__icon" style="color: #30b88a;"><q-icon name="menu_book" size="22px" /></div>
            <div class="lp-stat__value">{{ stats.totalTopics ?? 0 }}</div>
            <div class="lp-stat__label">전체 토픽</div>
          </template>
        </div>
        <div class="lp-stat">
          <q-skeleton v-if="!stats" type="text" width="60px" class="q-mx-auto" />
          <template v-else>
            <div class="lp-stat__icon" style="color: #118ab2;"><q-icon name="check_circle" size="22px" /></div>
            <div class="lp-stat__value">{{ stats.activeTopics ?? 0 }}</div>
            <div class="lp-stat__label">활성 토픽</div>
          </template>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #6b7280;"><q-icon name="calendar_today" size="22px" /></div>
          <div class="lp-stat__value">{{ weeklySchedule.length }}</div>
          <div class="lp-stat__label">이번 주 스케줄</div>
        </div>
      </div>

      <!-- Weekly Schedule -->
      <div class="lp-card q-mt-sm">
        <div class="lp-card__header">
          <span class="lp-card__title">주간 토픽 스케줄</span>
          <q-btn flat dense icon="open_in_new" size="sm" color="grey-5" @click="router.push('/aviation/topics')" />
        </div>
        <div class="lp-schedule">
          <div v-if="weeklySchedule.length === 0" class="lp-empty">
            <q-icon name="event_note" size="2rem" color="grey-4" />
            <span>등록된 스케줄이 없습니다</span>
          </div>
          <div
            v-for="item in weeklySchedule"
            :key="item.day_of_month ?? item.dayOfWeek"
            class="lp-schedule__item"
          >
            <span class="lp-schedule__day">{{ dayNames[item.day_of_month ?? item.dayOfWeek] }}</span>
            <span class="lp-schedule__name">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Navigation -->
      <div class="lp-nav-grid">
        <div class="lp-nav-card" @click="router.push('/aviation/topics')">
          <div class="lp-nav-card__icon" style="background: rgba(48,184,138,0.08); color: #30b88a;">
            <q-icon name="menu_book" size="24px" />
          </div>
          <div class="lp-nav-card__title">토픽 관리</div>
          <div class="lp-nav-card__desc">항공 지식 주제 등록 및 스케줄 편집</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
        <div class="lp-nav-card" @click="router.push('/aviation/weather')">
          <div class="lp-nav-card__icon" style="background: rgba(17,138,178,0.08); color: #118ab2;">
            <q-icon name="cloud" size="24px" />
          </div>
          <div class="lp-nav-card__title">날씨 현황</div>
          <div class="lp-nav-card__desc">기상청 날씨 이미지 수집 및 조회</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
        <div class="lp-nav-card" @click="router.push('/aviation/backups')">
          <div class="lp-nav-card__icon" style="background: rgba(107,114,128,0.08); color: #6b7280;">
            <q-icon name="backup" size="24px" />
          </div>
          <div class="lp-nav-card__title">백업 관리</div>
          <div class="lp-nav-card__desc">항공 지식 데이터 백업 및 복원</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { topicsApi } from '@/api/aviation/client'

const router = useRouter()
const $q = useQuasar()

const stats = ref<any>(null)
const weeklySchedule = ref<any[]>([])
const dayNames = ['일', '월', '화', '수', '목', '금', '토']

async function loadStats() {
  try {
    stats.value = await topicsApi.getStats()
  } catch (error: any) {
    $q.notify({ type: 'negative', message: '통계 로딩 실패: ' + error.message })
  }
}

async function loadSchedule() {
  try {
    weeklySchedule.value = await topicsApi.getSchedule()
  } catch (error: any) {
    $q.notify({ type: 'negative', message: '스케줄 로딩 실패: ' + error.message })
  }
}

onMounted(() => {
  loadStats()
  loadSchedule()
})
</script>

<style scoped lang="scss">
@import '@/assets/styles/landing-shared';
</style>
