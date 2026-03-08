<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="landing-hero">
      <div class="landing-hero__content">
        <h1 class="landing-hero__title">VoyagerSS</h1>
        <p class="landing-hero__subtitle">프리미엄 투자 데이터 구독 서비스</p>
        <p class="landing-hero__description">
          전문가가 큐레이션한 고퀄리티 편집 데이터로<br />
          더 스마트한 투자 인사이트를 경험하세요
        </p>
        <div class="landing-hero__actions">
          <router-link :to="{ name: 'investand-landing' }" class="landing-btn landing-btn--primary">
            구독 시작하기
          </router-link>
          <a href="#features" class="landing-btn landing-btn--secondary">
            더 알아보기
          </a>
        </div>
      </div>
      <div class="landing-hero__scroll-indicator">
        <q-icon name="keyboard_arrow_down" size="32px" color="white" />
      </div>
    </section>

    <!-- Data Excellence Section -->
    <section id="features" class="landing-section landing-section--gray">
      <div class="landing-section__container">
        <div class="landing-section__header fade-up">
          <h2 class="landing-section__title">데이터의 차이를 경험하세요</h2>
          <p class="landing-section__subtitle">
            VoyagerSS는 원본 데이터를 넘어, 전문가가 검증하고 편집한 프리미엄 데이터를 제공합니다
          </p>
        </div>

        <div class="landing-stats fade-up">
          <div class="landing-stats__item">
            <div class="landing-stats__value">99.9%</div>
            <div class="landing-stats__label">데이터 정확도</div>
            <div class="landing-stats__description">전문가 검증 완료</div>
          </div>
          <div class="landing-stats__item">
            <div class="landing-stats__value">실시간</div>
            <div class="landing-stats__label">업데이트 주기</div>
            <div class="landing-stats__description">시장 데이터 반영</div>
          </div>
          <div class="landing-stats__item">
            <div class="landing-stats__value">24/7</div>
            <div class="landing-stats__label">전문가 큐레이션</div>
            <div class="landing-stats__description">지속적인 품질 관리</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Products Section -->
    <section class="landing-section landing-section--dark">
      <div class="landing-section__container">
        <div class="landing-section__header fade-up">
          <h2 class="landing-section__title">우리의 솔루션</h2>
          <p class="landing-section__subtitle">
            각 분야 전문가가 설계한 통합 플랫폼
          </p>
        </div>

        <div class="landing-products fade-up">
          <!-- Investand -->
          <router-link
            :to="{ name: 'investand-landing' }"
            class="landing-products__card landing-products__card--investand"
          >
            <div class="landing-products__content">
              <q-icon name="show_chart" class="landing-products__icon" />
              <h3 class="landing-products__title">Investand</h3>
              <p class="landing-products__description">
                고급 투자 분석 플랫폼. 실시간 시장 데이터, DART 공시 통합,
                AI 기반 인사이트로 더 현명한 투자 결정을 내리세요.
              </p>
              <span class="landing-products__link">
                시작하기 <q-icon name="arrow_forward" size="18px" />
              </span>
            </div>
          </router-link>

          <!-- WorkSchd -->
          <router-link
            :to="{ name: 'workschd-home' }"
            class="landing-products__card landing-products__card--workschd"
          >
            <div class="landing-products__content">
              <q-icon name="schedule" class="landing-products__icon" />
              <h3 class="landing-products__title">WorkSchd</h3>
              <p class="landing-products__description">
                지능형 근무 일정 관리 시스템. AI 기반 자동 스케줄링,
                팀 협업, 출퇴근 관리로 생산성을 극대화하세요.
              </p>
              <span class="landing-products__link">
                시작하기 <q-icon name="arrow_forward" size="18px" />
              </span>
            </div>
          </router-link>

          <!-- Aviation -->
          <router-link
            :to="{ name: 'aviation-dashboard' }"
            class="landing-products__card landing-products__card--aviation"
          >
            <div class="landing-products__content">
              <q-icon name="flight" class="landing-products__icon" />
              <h3 class="landing-products__title">Aviation</h3>
              <p class="landing-products__description">
                종합 항공 데이터 플랫폼. 실시간 기상 정보, 토픽 관리,
                안전한 백업 솔루션을 제공합니다.
              </p>
              <span class="landing-products__link">
                시작하기 <q-icon name="arrow_forward" size="18px" />
              </span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section class="landing-section landing-section--light">
      <div class="landing-section__container">
        <div class="landing-section__header fade-up">
          <h2 class="landing-section__title">왜 VoyagerSS인가?</h2>
          <p class="landing-section__subtitle">
            구독형 서비스로 언제 어디서나 프리미엄 데이터에 접근하세요
          </p>
        </div>

        <div class="landing-features fade-up" style="background: transparent;">
          <div class="landing-features__item" style="background: #f5f5f7;">
            <q-icon name="verified" class="landing-features__icon" color="primary" />
            <h4 class="landing-features__title">검증된 데이터</h4>
            <p class="landing-features__text">
              모든 데이터는 전문가 팀의 검증을 거쳐 제공됩니다.
              신뢰할 수 있는 정보로 의사결정하세요.
            </p>
          </div>
          <div class="landing-features__item" style="background: #f5f5f7;">
            <q-icon name="update" class="landing-features__icon" color="accent" />
            <h4 class="landing-features__title">실시간 업데이트</h4>
            <p class="landing-features__text">
              시장 변화에 즉각 대응. 실시간으로 업데이트되는
              최신 데이터를 확인하세요.
            </p>
          </div>
          <div class="landing-features__item" style="background: #f5f5f7;">
            <q-icon name="support_agent" class="landing-features__icon" color="positive" />
            <h4 class="landing-features__title">전문가 지원</h4>
            <p class="landing-features__text">
              데이터 해석부터 활용까지. 전문가 팀이
              여러분의 성공을 지원합니다.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="landing-section landing-section--gray">
      <div class="landing-section__container">
        <div class="landing-section__header fade-up">
          <h2 class="landing-section__title">구독 플랜</h2>
          <p class="landing-section__subtitle">
            필요에 맞는 플랜을 선택하세요
          </p>
        </div>

        <div class="landing-pricing fade-up">
          <div class="landing-pricing__card">
            <div class="landing-pricing__name">Basic</div>
            <div class="landing-pricing__price">₩29,000<span>/월</span></div>
            <ul class="landing-pricing__features">
              <li>기본 시장 데이터 접근</li>
              <li>일간 리포트</li>
              <li>이메일 지원</li>
            </ul>
            <button class="landing-btn landing-btn--dark" style="width: 100%;">
              시작하기
            </button>
          </div>

          <div class="landing-pricing__card landing-pricing__card--featured">
            <div class="landing-pricing__name">Pro</div>
            <div class="landing-pricing__price">₩79,000<span>/월</span></div>
            <ul class="landing-pricing__features">
              <li>전체 프리미엄 데이터</li>
              <li>실시간 알림</li>
              <li>API 접근</li>
              <li>우선 지원</li>
            </ul>
            <button class="landing-btn landing-btn--dark" style="width: 100%;">
              시작하기
            </button>
          </div>

          <div class="landing-pricing__card">
            <div class="landing-pricing__name">Enterprise</div>
            <div class="landing-pricing__price">문의<span></span></div>
            <ul class="landing-pricing__features">
              <li>맞춤형 데이터 솔루션</li>
              <li>전용 계정 매니저</li>
              <li>SLA 보장</li>
              <li>온사이트 교육</li>
            </ul>
            <button class="landing-btn landing-btn--dark" style="width: 100%;">
              문의하기
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="landing-footer__container">
        <div class="landing-footer__grid">
          <div class="landing-footer__brand">
            <h3>VoyagerSS</h3>
            <p>
              투자 분석, 일정 관리, 항공 데이터를 위한 통합 솔루션.
              프리미엄 데이터로 여러분의 성공을 지원합니다.
            </p>
          </div>

          <div class="landing-footer__column">
            <h4>서비스</h4>
            <ul>
              <li><router-link :to="{ name: 'investand-landing' }">Investand</router-link></li>
              <li><router-link :to="{ name: 'workschd-home' }">WorkSchd</router-link></li>
              <li><router-link :to="{ name: 'aviation-dashboard' }">Aviation</router-link></li>
            </ul>
          </div>

          <div class="landing-footer__column">
            <h4>리소스</h4>
            <ul>
              <li><a href="#">문서</a></li>
              <li><a href="#">API 레퍼런스</a></li>
              <li><a href="#">블로그</a></li>
            </ul>
          </div>

          <div class="landing-footer__column">
            <h4>회사</h4>
            <ul>
              <li><a href="#">소개</a></li>
              <li><a href="#">연락처</a></li>
              <li><a href="#">개인정보처리방침</a></li>
            </ul>
          </div>
        </div>

        <div class="landing-footer__bottom">
          <p>© 2024 VoyagerSS Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// Scroll animation observer
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.fade-up').forEach((el) => {
    observer?.observe(el)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>