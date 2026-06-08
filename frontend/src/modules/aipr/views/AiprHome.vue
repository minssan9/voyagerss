<template>
  <q-page class="lp-page">
    <div class="lp-container">

      <!-- Hero -->
      <section class="lp-hero">
        <span class="lp-badge" style="background: rgba(0,113,227,0.08); color: #0071e3;">
          <q-icon name="auto_awesome" size="14px" />
          AI 개발 컨설팅
        </span>
        <h1 class="lp-title">바이브 코딩을<br>운영 가능한 시스템으로</h1>
        <p class="lp-subtitle">
          서비스를 만든 다음엔, 운영이라는 또 다른 과제가 시작됩니다.<br>개발에 집중하세요 — 필요한 부분은 저희가 가이드합니다.
        </p>
        <div class="lp-actions">
          <q-btn
            class="lp-btn-primary"
            label="이슈 등록하고 시작하기"
            no-caps unelevated
            :to="{ name: 'aipr-issues' }"
          />
          <q-btn
            class="lp-btn-secondary"
            label="피드백 위젯 체험하기"
            no-caps outline
            :to="{ name: 'aipr-widget' }"
          />
        </div>
      </section>

      <!-- Stats Strip -->
      <div class="lp-stats">
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="psychology" size="22px" /></div>
          <div class="lp-stat__value">AI 플래닝</div>
          <div class="lp-stat__label">이슈 → 계획 문서 자동 생성</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="merge_type" size="22px" /></div>
          <div class="lp-stat__value">자동 빌드·PR</div>
          <div class="lp-stat__label">코드 작성부터 PR까지 한 번에</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="insights" size="22px" /></div>
          <div class="lp-stat__value">실시간 추적</div>
          <div class="lp-stat__label">진행 상황과 비용을 투명하게</div>
        </div>
      </div>

      <!-- Feature Cards -->
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
              <q-icon name="psychology" size="28px" />
            </div>
            <div class="lp-feature-title">AI 플래닝</div>
            <div class="lp-feature-desc">등록된 이슈를 분석해 실행 가능한 계획 문서를 자동으로 작성합니다. 무엇을, 왜, 어떻게 만들지 미리 정리해 드립니다.</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> 이슈 기반 계획 문서 자동 생성</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 버전 관리로 변경 이력 추적</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 우선순위와 범위 자동 정리</span>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
              <q-icon name="build" size="28px" />
            </div>
            <div class="lp-feature-title">자동 빌드 &amp; PR</div>
            <div class="lp-feature-desc">계획이 정해지면 AI가 직접 브랜치를 만들고 코드를 작성해 PR까지 올립니다. 진행 상황과 비용도 함께 확인하세요.</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> PLAN / BUILD 모드 실행</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 브랜치·PR 자동 연동</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 실행 비용 추적</span>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
              <q-icon name="feedback" size="28px" />
            </div>
            <div class="lp-feature-title">임베드 피드백 위젯</div>
            <div class="lp-feature-desc">외부 사이트에 코드 한 줄만 추가하면 사용자 피드백이 곧바로 이슈로 등록됩니다. 수집부터 처리까지 끊김 없이 이어집니다.</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> 한 줄 스크립트로 설치</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> 스크린샷 첨부 지원</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> CORS 화이트리스트 관리</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Consulting Scope -->
      <section class="lp-section-header q-mt-xl">
        <h2 class="lp-section-title">AI 개발 컨설팅, 이렇게 도와드립니다</h2>
        <p class="lp-section-desc">바이브 코딩으로 빠르게 만든 서비스가 안정적으로 운영되도록, 아래 영역을 함께 구성해 드립니다.</p>
      </section>

      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
              <q-icon name="monitoring" size="24px" />
            </div>
            <div class="lp-scope-item__title">모니터링</div>
            <div class="lp-scope-item__desc">운영 중인 서비스 상태와 이슈를 실시간으로 살펴봅니다</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
              <q-icon name="build" size="24px" />
            </div>
            <div class="lp-scope-item__title">빌드</div>
            <div class="lp-scope-item__desc">AI가 코드를 작성하고 빌드까지 자동으로 처리합니다</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
              <q-icon name="fact_check" size="24px" />
            </div>
            <div class="lp-scope-item__title">테스트</div>
            <div class="lp-scope-item__desc">자동화된 테스트로 변경 사항의 품질을 검증합니다</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(234,67,53,0.08); color: #ea4335;">
              <q-icon name="rocket_launch" size="24px" />
            </div>
            <div class="lp-scope-item__title">배포 자동화</div>
            <div class="lp-scope-item__desc">CI/CD 파이프라인을 구성해 배포까지 자동화합니다</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(103,65,217,0.08); color: #6741d9;">
              <q-icon name="settings_suggest" size="24px" />
            </div>
            <div class="lp-scope-item__title">구성 개발</div>
            <div class="lp-scope-item__desc">운영에 필요한 설정과 인프라 구성을 함께 만들어 드립니다</div>
          </div>
        </div>
      </div>

      <!-- Quick Navigation -->
      <div class="lp-nav-grid">
        <router-link :to="{ name: 'aipr-issues' }" class="lp-nav-card">
          <div class="lp-nav-card__icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
            <q-icon name="list" size="24px" />
          </div>
          <div class="lp-nav-card__title">이슈 관리</div>
          <div class="lp-nav-card__desc">등록된 피드백과 진행 상황 확인</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </router-link>
        <router-link :to="{ name: 'aipr-repos' }" class="lp-nav-card">
          <div class="lp-nav-card__icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
            <q-icon name="folder_open" size="24px" />
          </div>
          <div class="lp-nav-card__title">저장소 연동</div>
          <div class="lp-nav-card__desc">GitHub·GitLab 저장소와 Provider 설정</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </router-link>
        <router-link :to="{ name: 'aipr-settings' }" class="lp-nav-card">
          <div class="lp-nav-card__icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
            <q-icon name="settings" size="24px" />
          </div>
          <div class="lp-nav-card__title">운영 설정</div>
          <div class="lp-nav-card__desc">권한, 알림, 자동화 옵션 관리</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </router-link>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
@import '@/assets/styles/landing-shared';

.lp-nav-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.lp-section-header {
  text-align: center;
}

.lp-section-title {
  font-size: 26px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.lp-section-desc {
  font-size: 14px;
  color: #6e6e73;
  line-height: 1.6;
}

.lp-scope-item {
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 16px;
  height: 100%;
  text-align: center;
}

.lp-scope-item__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.lp-scope-item__title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 6px;
}

.lp-scope-item__desc {
  font-size: 12px;
  color: #6e6e73;
  line-height: 1.5;
}
</style>
