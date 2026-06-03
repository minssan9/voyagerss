<template>
  <q-page class="lp-page">
    <div class="lp-container">

      <!-- Hero -->
      <section class="lp-hero">
        <span class="lp-badge" style="background: rgba(0,113,227,0.08); color: #0071e3;">
          <q-icon name="event_note" size="14px" />
          상조 서비스 스케줄
        </span>
        <h1 class="lp-title">근무 스케줄<br>자동 관리</h1>
        <p class="lp-subtitle">
          장례식장 근무 배치부터 신청·승인까지<br>팀 기반으로 한 곳에서 관리합니다
        </p>
        <div class="lp-actions">
          <q-btn class="lp-btn-primary" label="업무 관리" no-caps unelevated @click="router.push('/workschd/task/manage')" />
          <q-btn class="lp-btn-secondary" label="빈소 현황" no-caps outline @click="router.push('/workschd/funeral-board')" />
        </div>
      </section>

      <!-- Stats Strip -->
      <div class="lp-stats">
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="schedule" size="22px" /></div>
          <div class="lp-stat__value">자동화</div>
          <div class="lp-stat__label">스케줄 생성</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="notifications_active" size="22px" /></div>
          <div class="lp-stat__value">실시간</div>
          <div class="lp-stat__label">알림 시스템</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="groups" size="22px" /></div>
          <div class="lp-stat__value">팀 기반</div>
          <div class="lp-stat__label">역할별 권한</div>
        </div>
      </div>

      <!-- Feature Cards -->
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
              <q-icon name="assignment" size="28px" />
            </div>
            <div class="lp-feature-title">업무(Task) 관리</div>
            <div class="lp-feature-desc">장례식장 근무 일정을 등록하고, 인력 신청·승인을 관리합니다. 출퇴근 체크인까지 지원합니다.</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> 근무 일정 등록 및 수정</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 인력 신청 / 승인 / 거절</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 출퇴근 체크인</span>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
              <q-icon name="people" size="28px" />
            </div>
            <div class="lp-feature-title">팀 관리</div>
            <div class="lp-feature-desc">팀을 생성하고 초대 링크로 멤버를 추가합니다. 리더와 헬퍼 역할로 권한을 분리합니다.</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> 초대 링크 기반 가입</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> LEADER / HELPER 권한</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 장례식장(Shop) 관리</span>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
              <q-icon name="monitor_heart" size="28px" />
            </div>
            <div class="lp-feature-title">빈소 현황 스크래퍼</div>
            <div class="lp-feature-desc">인천·부천 21개 장례식장의 빈소 현황을 실시간으로 수집하여 빠른 배치를 지원합니다.</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> 21개 사이트 자동 수집</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 인천 / 부천 지역 필터</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 업무와 직접 연결</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Navigation -->
      <div class="lp-nav-grid">
        <div class="lp-nav-card" @click="router.push('/workschd/task/manage')">
          <div class="lp-nav-card__icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
            <q-icon name="assignment" size="24px" />
          </div>
          <div class="lp-nav-card__title">업무 관리</div>
          <div class="lp-nav-card__desc">근무 일정 등록 및 인력 배치</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
        <div class="lp-nav-card" @click="router.push('/workschd/team/manage')">
          <div class="lp-nav-card__icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
            <q-icon name="group" size="24px" />
          </div>
          <div class="lp-nav-card__title">팀 관리</div>
          <div class="lp-nav-card__desc">팀 생성 및 멤버 초대·승인</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
        <div class="lp-nav-card" @click="router.push('/workschd/funeral-board')">
          <div class="lp-nav-card__icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
            <q-icon name="dashboard" size="24px" />
          </div>
          <div class="lp-nav-card__title">빈소 현황</div>
          <div class="lp-nav-card__desc">실시간 장례식장 현황 보드</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped lang="scss">
@import '@/assets/styles/landing-shared';
</style>
